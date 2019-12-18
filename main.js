'use strict';

const path = require('path');
const {app, ipcMain, Menu, Tray} = require('electron');
const { autoUpdater} = require('electron-updater');

const Window = require('./Window');
const DataStore = require('./DataStore');

require('electron-reload')(__dirname);

const todosData = new DataStore ({ name: 'Todos Main'});

function api_hikvision () {

    const Axios = require("axios");
    const xml2js = require('xml2js');
    let placas = [];
    let placaImg = "";
    let placaBase64 = "";
    let data = "2019-12-29";
    let hora = "00:00:00";
    const cron = require("node-cron");
    const dateTime = require("date-time");

    cron.schedule('* * * * * *', () => {

        for (let api of todosData.getTodos().todos) {
            console.log(api);

            data = dateTime().split(" ")[0];
            hora = dateTime().split(" ")[1];
            console.log(data);
            console.log(hora);

            console.log("iniciando axios" + api);

            Axios.get(api + '/ISAPI/Traffic/channels/1/vehicleDetect/plates/', {
                data: '<AfterTime version="1.0" xmlns="http://www.isapi.org/ver20/XMLSchema"><picTime>' + data + 'T' + hora + '</picTime></AfterTime>'
            }).then(res => {
                console.log('axios ' + api);
                console.log("recebeu xml");
                console.log(res);

                xml2js.parseString(res.data, {explicitArray: false}, function (err, result) {
                    placas = (result.Plates.Plate);
                    //  console.log(placas);
                    console.log("tranformou em json")
                });

                console.log("kuma");

                for (let placa of placas) {
                    placaImg = placa.picName;
                    console.log(placa.picName);

                    Axios.get(api + '/doc/ui/images/plate/' + placaImg + '.jpg', {responseType: 'arraybuffer'})
                        .then(res => {
                            console.log("binario");
                            //console.log(res.data);
                            placaBase64 = Buffer.from(res.data, 'binary').toString('base64');
                            placaBase64 = "data:image/jpeg;base64," + placaBase64;
                            console.log("string base 64");
                            //console.log(placaBase64);

                            let data = {
                                data: placa.captureTime,
                                placa: placa.plateNumber,
                                faixa: placa.laneNo,
                                foto: placaBase64,
                            };
                            //console.log(data);
                            console.log('JSON ok')

                            Axios.post('http://localhost', JSON.stringify(data))
                                .then(res => {
                                    console.log(" -- " + res)
                                }).catch(err => console.log("erro -- "));

                        }).catch(() => console.log('erro -- ++ '));
                }
            });
        }
    })
}


function main() {

    api_hikvision();

    let mainWindow = new Window({
        file: path.join('renderer', 'index.html')
    });

    let addTodoWin;

    mainWindow.once('show', () => {
        mainWindow.webContents.send('todos', todosData.todos)
    });

    let tray = null;


    tray = new Tray( __dirname + '/imagens/hikvision.png');

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Abrir Configurações', click: function () {
                mainWindow.show();
            }
        },
        {
            label: 'Quit', click: function () {
                app.isQuiting = true;
                app.quit();
            }
        }
    ])

    tray.setToolTip('LPR HIKVISION MONITOR')
    tray.setContextMenu(contextMenu)
    tray.on('double-click', () =>{
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    })
    mainWindow.on('close', function (event){
        if(!app.isQuiting){
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    })

    mainWindow.on('closed', function () {
        tray.destroy();

    })

    ipcMain.on('add-todo-window', () => {
        if(!addTodoWin) {
            addTodoWin = new Window ({
                file: path.join('renderer', 'add.html'),
                width: 400,
                height: 400,
                parent: mainWindow
            });

            addTodoWin.on('closed', () => {
                addTodoWin = null
            })
        }
    });

    ipcMain.on('add-todo', (event, todo) => {
        const updatedTodos = todosData.addTodo(todo).todos;

        mainWindow.send('todos', updatedTodos)
    });

    ipcMain.on('delete-todo', (event, todo) => {
        const updatedTodos = todosData.deleteTodo(todo).todos;

        mainWindow.send('todos', updatedTodos)
    });

    autoUpdater.on('update-avaliable', () =>{
        mainWindow.webContents.send('update_avaliable');
    });

    autoUpdater.on('update-downloaded', () =>{
        mainWindow.webContents.send('update_downloaded');
    });

    ipcMain.on('restart_app', () => {
        autoUpdater.quitAndInstall();
    });

}

app.on('ready', main);

autoUpdater.checkForUpdatesAndNotify();

app.on('window-all-closed', function (){
    app.quit();
});

