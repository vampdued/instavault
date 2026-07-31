package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	windowsOptions "github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend
var assets embed.FS

func main() {
	app, err := NewApp()
	if err != nil {
		log.Fatal(err)
	}

	err = wails.Run(&options.App{
		Title:            "InstaVault",
		Width:            980,
		Height:           680,
		MinWidth:         760,
		MinHeight:        560,
		BackgroundColour: options.NewRGB(15, 17, 21),
		AssetServer:      &assetserver.Options{Assets: assets},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind:             []interface{}{app},
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId: "aab2a9aa-5ac7-4ed5-bc98-e5d4d8944131",
			OnSecondInstanceLaunch: func(_ options.SecondInstanceData) {
				app.focus()
			},
		},
		Windows: &windowsOptions.Options{
			Theme:        windowsOptions.SystemDefault,
			BackdropType: windowsOptions.Mica,
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}
