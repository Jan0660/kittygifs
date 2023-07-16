#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
use clap::{arg, command, Parser};
use enigo::{Enigo, KeyboardControllable};
use global_hotkey::{
    hotkey::{Code, HotKey, Modifiers},
    GlobalHotKeyEvent, GlobalHotKeyManager,
};
use serde::{Deserialize, Serialize};
use std::{str::FromStr, sync::Mutex, time::Duration};
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

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// show popup and exit after it closes
    #[arg(short, long)]
    popup: bool,
    /// number of milliseconds to wait between minimizing popup and inputting the url
    #[arg(long, default_value = "70")]
    popup_delay: u64,
    /// delay to pass to enigo for inputting text
    #[arg(long, default_value = "12000")]
    enigo_delay: u64,
}

lazy_static::lazy_static! {
    static ref APP_HANDLE: Mutex<Option<tauri::AppHandle>> = Mutex::new(None);
    static ref CONFIG_PATH: Mutex<Option<std::path::PathBuf>> = Mutex::new(None);
    static ref CONFIG: Mutex<Option<Config>> = Mutex::new(None);
    static ref ARGS: Mutex<Option<Args>> = Mutex::new(None);
}

fn main() {
    {
        let args = Args::parse();
        ARGS.lock().unwrap().replace(args);
    }

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
            // app.get_window("main").unwrap().open_devtools();
            // hide the popup window when it loses focus or is minimized or is closed
            let window = app.get_window("popup").unwrap();
            window.on_window_event(|event| {
                let app = APP_HANDLE.lock().unwrap().as_ref().unwrap().clone();
                match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        // println!("close requested");
                        exit_if_popup();
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
                            exit_if_popup();
                            let window = app.get_window("popup").unwrap();
                            window.hide().unwrap();
                        }
                    }
                    _ => {}
                }
            });
            if ARGS.lock().unwrap().as_ref().unwrap().popup {
                app.get_window("main").unwrap().hide().unwrap();
                app.get_window("popup").unwrap().show().unwrap();
                return Ok(());
            }
            // load the config
            let config_dir = app.path().app_config_dir().unwrap();
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
                println!("hotkey pressed: {:?}", _event);
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
    let binding = ARGS.lock().unwrap();
    let args = binding.as_ref().unwrap();
    // hide the window
    window.minimize().unwrap();
    // write the url to clipboard, then paste it
    // let mut ctx = ClipboardContext::new().unwrap();
    // let previous = ctx.get_contents();
    // ctx.set_contents(url.to_string()).unwrap();
    // std::thread::sleep(Duration::from_millis(100));
    let mut enigo = Enigo::new();
    #[cfg(target_os = "linux")]
    {
        enigo.set_delay(args.enigo_delay);
    }
    // enigo.key_sequence_parse("{+CTRL}v{-CTRL}{RETURN}");
    let popup = args.popup;
    let popup_delay = args.popup_delay;
    if popup {
        let url_clone = url.to_string();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(popup_delay));
            enigo.key_sequence(url_clone.as_str());
            enigo.key_sequence_parse("{RETURN}");
            window.hide().unwrap();
        });
    } else {
        enigo.key_sequence(url);
        enigo.key_sequence_parse("{RETURN}");
        window.hide().unwrap();
    }
    // restore the previous clipboard contents
    // if previous.is_ok() {
    //     ctx.set_contents(previous.unwrap());
    // }
    std::thread::spawn(|| {
        std::thread::sleep(Duration::from_millis(800));
        exit_if_popup();
    });
}

#[tauri::command]
fn set_hotkey(modifiers: u32, code: &str) {
    let modifiers = Modifiers::from_bits(modifiers).unwrap();
    let code = Code::from_str(code).unwrap();
    let mut binding = CONFIG.lock().unwrap();
    let config = binding.as_mut().unwrap();
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

fn exit_if_popup() {
    if ARGS.lock().unwrap().as_ref().unwrap().popup {
        std::process::exit(0);
    }
}
