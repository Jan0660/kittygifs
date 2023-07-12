#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
use enigo::{Enigo, KeyboardControllable};
use global_hotkey::{
    hotkey::{Code, HotKey, Modifiers},
    GlobalHotKeyEvent, GlobalHotKeyManager,
};
use std::sync::Mutex;
use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
    WindowEvent,
};

lazy_static::lazy_static! {
    static ref APP_HANDLE: Mutex<Option<tauri::AppHandle>> = Mutex::new(None);
}

fn main() {
    let hotkey_manager = GlobalHotKeyManager::new().unwrap();
    hotkey_manager
        .register(HotKey::new(Some(Modifiers::CONTROL), Code::KeyD))
        .unwrap();
    GlobalHotKeyEvent::set_event_handler(Some(move |_event| {
        // println!("hotkey pressed: {:?}", event);
        let app = APP_HANDLE.lock().unwrap().as_ref().unwrap().clone();
        let window = app.get_window("popup").unwrap();
        window.show().unwrap();
        window.unminimize().unwrap();
        window.set_focus().unwrap();
    }));
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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![selected])
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
