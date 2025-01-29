import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent,
     DidReceiveSettingsEvent } from "@elgato/streamdeck";
import socket from '../websocket/socket';
import { createCanvas, loadImage } from 'canvas';
import { promises as fs } from 'fs';
import path from 'path';

let fullTeamList: Team[] = [];

let fakeTeamList = [
    {
        id: 1,
        name: 'Cat 1',
        logo: 'https://placecats.com/200/200'
    },
    {
        id: 2,
        name: 'Cat 2',
        logo: 'https://placecats.com/200/200'
    },
    {
        id: 3,
        name: 'Cat 3',
        logo: 'https://placecats.com/200/200'
    },
    {
        id: 4,
        name: 'Cat 4',
        logo: 'https://placecats.com/200/200'
    }   
];



@action({ UUID: "com.esportsdash.esportsdash-controller.selectteam" })
export class SelectTeam extends SingletonAction<SelectTeamSettings> {
    constructor() {
        super();
        socket.on('connect', () => {
            this.updateButtonTitle(true);
        });

        socket.on('disconnect', () => {
            this.updateButtonTitle(false);
        });
    }


    private updateButtonTitle(isConnected: boolean): void {
        this.actions.forEach(action => {
            action.setTitle(isConnected ? `SELECT\nTEAM` : ``);
            action.setImage(isConnected ? '' : 'imgs/actions/disconnected.png');
        });
    }


    
    private async setButtonInfo(ev: EventPayload) {
        const { team, teamList } = ev.payload.settings;
        // find team in list based on name aka 'teamList' will be teamname here
        
        if (fullTeamList.length > 0) {
            const matchedTeam = fullTeamList.find(t => t.name === teamList);
            if (!matchedTeam) {
                streamDeck.logger.error('Team not found:', teamList);
                return;
            }

            // setting the title & logo based on the team selected
            ev.action.setTitle(`${matchedTeam.name}`);
            const teamLogo = await this._fetchImageAsBase64(ev, matchedTeam.logo);
            ev.action.setImage(teamLogo);
        }



    }





    // using just the basic image
    // private async _fetchImageAsBase64(url: string): Promise<string> {
    //     const response = await fetch(url);
    //     const arrayBuffer = await response.arrayBuffer();
    //     return `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
    // }


    // layering the team logo on top of a base image
    private async _fetchImageAsBase64(ev:EventPayload, url: string): Promise<string> {
        const MAX_SIZE = 72;
    
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
    
        // Load remote and local images
        const img = await loadImage(buffer);
        // const localImagePath = path.resolve('imgs/actions/selectteam/teamSelect-t1.png');
        const localImagePath = path.resolve(`imgs/actions/selectteam/teamSelect-t${ev.payload.settings.teamSide}.png`);
        const localImageBuffer = await fs.readFile(localImagePath);
        const localImg = await loadImage(localImageBuffer);
    
        // Function to resize an image while maintaining aspect ratio
        const resizeImage = (image: any) => {
            const scale = Math.min(MAX_SIZE / image.width, MAX_SIZE / image.height);
            return {
                width: Math.round(image.width * scale),
                height: Math.round(image.height * scale),
            };
        };
    
        const imgSize = resizeImage(img);
        const localImgSize = resizeImage(localImg);
    
        // Create a fixed 128x128 canvas
        const canvas = createCanvas(MAX_SIZE, MAX_SIZE);
        const ctx = canvas.getContext('2d');
    
        // Calculate positions to center images
        const imgX = (MAX_SIZE - imgSize.width) / 2;
        const imgY = (MAX_SIZE - imgSize.height) / 2;
        const localImgX = (MAX_SIZE - localImgSize.width) / 2;
        const localImgY = (MAX_SIZE - localImgSize.height) / 2;
    
        // Draw images centered on the canvas
        ctx.drawImage(img, imgX, imgY, imgSize.width, imgSize.height);
        ctx.drawImage(localImg, localImgX, localImgY, localImgSize.width, localImgSize.height);
    
        return canvas.toDataURL('image/png');
    }


    override onWillAppear(ev: WillAppearEvent<SelectTeamSettings>): void | Promise<void> {
        this.updateButtonTitle(socket.connected);
        const currentSettings = ev.payload.settings;

        streamDeck.logger.info('ButtonAppears:', currentSettings);

        // fires anytime the global settings are updated
        streamDeck.settings.onDidReceiveGlobalSettings(async (event) => {
			// if (!event.settings.auth_ok) {
			// 	await ev.action.setTitle("Please\nAuthorize")
			// } else {
            //     await ev.action.setTitle("RECEIVED GLOBAL")
            // }

            // setting the teamlist locally for image/logo reference
            if (event.settings.teamList) {
                fullTeamList = event.settings.teamList as Team[];
            }
        });


        // fetch team list on 'startup'
        streamDeck.settings.getGlobalSettings().then(globalSettings => {
            streamDeck.logger.info('GlobalSettings:', globalSettings);
            fullTeamList = globalSettings.teamList as Team[];
            this.setButtonInfo(ev);
        });


        // this.setButtonInfo(ev);
    }


    override async onKeyDown(ev: KeyDownEvent<SelectTeamSettings>): Promise<void> {
        if (!socket.connected) {
            ev.action.showAlert();
            return;
        }
        const { settings } = ev.payload;
        const response = await fetch(`http://localhost:8080/api/setTeamName?team=${settings.teamSide}&name=${settings.teamList}`);
        const data = await response.json() as Data;

        if (data.status === 'error') {
            ev.action.showAlert();
            return;
        }
        ev.action.showOk();


    }

    


    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<SelectTeamSettings>): Promise<void> {
        streamDeck.logger.info('Received settings from SelectTEAM:', ev.payload.settings);
        this.setButtonInfo(ev);
    }

    override async onWillDisappear(ev: WillDisappearEvent<SelectTeamSettings>): Promise<void> {
    }
}


type Team = {
    id: number;
    name: string;
    logo: string;
};


type SelectTeamSettings = {
    team?: string;
    teamLogo: string;
    teamList?: string;
    teamSide?: string;
    teamSelection?: string;
};


type Data = {
    status: string;
    message: string;
};


interface EventPayload {
    payload: {
        settings: SelectTeamSettings ;
    };
    action: any;
}