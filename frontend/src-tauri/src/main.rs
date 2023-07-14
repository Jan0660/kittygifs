#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
use enigo::{Enigo, KeyboardControllable};
use global_hotkey::{
    hotkey::{Code, HotKey, Modifiers},
    GlobalHotKeyEvent, GlobalHotKeyManager,
};
use serde::{Deserialize, Serialize};
use std::{str::FromStr, sync::Mutex};
use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
    WindowEvent,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Config {
    // should be of keyboard_types::Modifiers type
    modifiers: Modifiers,
    // should be of keyboard_types::Code type
    code: Code,
}

lazy_static::lazy_static! {
    static ref APP_HANDLE: Mutex<Option<tauri::AppHandle>> = Mutex::new(None);
    static ref CONFIG_PATH: Mutex<Option<std::path::PathBuf>> = Mutex::new(None);
    static ref CONFIG: Mutex<Option<Config>> = Mutex::new(None);
}

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide");
    let hide_popup = CustomMenuItem::new("hide_popup".to_string(), "Hide Popup");
    let tray_menu = SystemTrayMenu::new()
        .add_item(quit)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(hide)
        .add_item(hide_popup);
    let tray = SystemTray::new().with_menu(tray_menu);
    tauri::Builder::default()
        .system_tray(tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "hide" => {
                    let window = app.get_window("main").unwrap();
                    window.hide().unwrap();
                }
                "hide_popup" => {
                    let window = app.get_window("popup").unwrap();
                    window.hide().unwrap();
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            APP_HANDLE.lock().unwrap().replace(app.handle());
            // hide the popup window when it loses focus or is minimized or is closed
            let window = app.get_window("popup").unwrap();
            window.on_window_event(|event| {
                let app = APP_HANDLE.lock().unwrap().as_ref().unwrap().clone();
                match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        // println!("close requested");
                        let window = app.get_window("popup").unwrap();
                        window.hide().unwrap();
                        api.prevent_close();
                    }
                    WindowEvent::Resized(physical_size) => {
                        // println!(
                        //     "resized, w: {}, h: {}",
                        //     physical_size.width, physical_size.height
                        // );
                        if physical_size.width == 0 && physical_size.height == 0 {
                            let window = app.get_window("popup").unwrap();
                            window.hide().unwrap();
                        }
                    }
                    _ => {}
                }
            });
            // load the config
            let config_dir = app.path_resolver().app_config_dir().unwrap();
            std::fs::create_dir_all(&config_dir).unwrap();
            let config = config_dir.join("config.json");
            println!("config path: {:?}", config);
            CONFIG_PATH.lock().unwrap().replace(config.clone());
            let config = match std::fs::File::open(config) {
                Ok(file) => serde_json::from_reader::<std::fs::File, Config>(file)
                    .expect("Failed to parse config file"),
                Err(_) => Config {
                    modifiers: Modifiers::CONTROL | Modifiers::SHIFT,
                    code: Code::KeyG,
                },
            };
            CONFIG.lock().unwrap().replace(config.clone());
            // register hotkeys
            let hotkey_manager = GlobalHotKeyManager::new().unwrap();
            hotkey_manager
                .register(HotKey::new(Some(config.modifiers), config.code))
                .unwrap();
            GlobalHotKeyEvent::set_event_handler(Some(move |_event| {
                // println!("hotkey pressed: {:?}", event);
                let app = APP_HANDLE.lock().unwrap().as_ref().unwrap().clone();
                let window = app.get_window("popup").unwrap();
                window.show().unwrap();
                window.unminimize().unwrap();
                window.set_focus().unwrap();
            }));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![selected, set_hotkey, get_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
// should be called from the popup window
fn selected(url: &str, window: tauri::Window) {
    // hide the window
    window.minimize().unwrap();
    // write the url to clipboard, then paste it
    // let mut ctx = ClipboardContext::new().unwrap();
    // let previous = ctx.get_contents();
    // ctx.set_contents(url.to_string()).unwrap();
    // std::thread::sleep(Duration::from_millis(100));
    let mut enigo = Enigo::new();
    // enigo.key_sequence_parse("{+CTRL}v{-CTRL}{RETURN}");
    enigo.key_sequence(url);
    enigo.key_sequence_parse("{RETURN}");
    // restore the previous clipboard contents
    // if previous.is_ok() {
    //     ctx.set_contents(previous.unwrap());
    // }
    window.hide().unwrap();
}

#[tauri::command]
fn set_hotkey(modifiers: u32, code: &str) {
    let modifiers = Modifiers::from_bits(modifiers).unwrap();
    let code = Code::from_str(code).unwrap();
    let mut binding = CONFIG.lock().unwrap();
    let mut config = binding.as_mut().unwrap();
    config.modifiers = modifiers;
    config.code = code;
    save_config(&config);
}

#[tauri::command]
async fn get_config() -> Config {
    CONFIG.lock().unwrap().clone().unwrap()
}

fn save_config(config: &Config) {
    let config_path = CONFIG_PATH.lock().unwrap().as_ref().unwrap().clone();
    let file = std::fs::File::create(config_path).unwrap();
    serde_json::to_writer(file, &config).unwrap();
}
