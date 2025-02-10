import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import socket from '../websocket/socket';
import { createCanvas,
    //  loadImage,
     Image 
    } from 'canvas';
import { promises as fs } from 'fs';
import path from 'path';

import sharp from 'sharp';


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
    private teams: Team[] = [];

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
        const { teamSide, teamList } = ev.payload.settings;

        if (!teamList || !teamSide) {
            ev.action.setTitle('Select\nTeam');
            return;
        }

        try {
            const selectedTeam = this.teams.find(t => t.id.toString() === teamList);
            if (!selectedTeam) {
                streamDeck.logger.error(`Team not found with ID: ${teamList}`);
                ev.action.setTitle('Invalid\nTeam');
                return;
            }

            // Set the button title with team information
            ev.action.setTitle(`${selectedTeam.name}`);

            // Update the settings to store the complete team data
            const updatedSettings = {
                ...ev.payload.settings,
                teamLogo: selectedTeam.logo,
                teamName: selectedTeam.name // Store the name as well for reference
            };
            await ev.action.setSettings(updatedSettings);

        } catch (error) {
            streamDeck.logger.error('Error setting button info:', error);
            ev.action.setTitle('Error');
        }
    }

    override async onWillAppear(ev: WillAppearEvent<SelectTeamSettings>): Promise<void> {
        this.updateButtonTitle(socket.connected);

        try {
            // Initialize teams from global settings
            const globalSettings = await streamDeck.settings.getGlobalSettings();
            if (globalSettings.teamList) {
                this.teams = globalSettings.teamList as Team[];
                await this.setButtonInfo(ev);
            }

            // Listen for global settings updates
            streamDeck.settings.onDidReceiveGlobalSettings(async (event) => {
                if (event.settings.teamList) {
                    this.teams = event.settings.teamList as Team[];
                    await this.setButtonInfo(ev);
                }
            });
        } catch (error) {
            streamDeck.logger.error('Error in onWillAppear:', error);
            ev.action.setTitle('Error');
        }
    }

    override async onKeyDown(ev: KeyDownEvent<SelectTeamSettings>): Promise<void> {
        if (!socket.connected) {
            ev.action.showAlert();
            return;
        }

        const { teamSide, teamList, teamName } = ev.payload.settings;

        if (!teamSide || !teamList) {
            ev.action.showAlert();
            return;
        }

        try {
            // Using teamName for the API call since that's what the backend expects
            const response = await fetch(`http://localhost:8080/api/setTeamName?team=${teamSide}&name=${teamName}`);
            const data = await response.json() as Data;

            if (data.status === 'error') {
                ev.action.showAlert();
                return;
            }

            ev.action.showOk();
        } catch (error) {
            streamDeck.logger.error('Error in onKeyDown:', error);
            ev.action.showAlert();
        }
    }

    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<SelectTeamSettings>): Promise<void> {
        streamDeck.logger.info('Received settings:', ev.payload.settings);
        await this.setButtonInfo(ev);
    }

    // Keep all the commented out image processing code here
    // private async loadImageFromBuffer(buffer: Buffer): Promise<Image> {
    //     if (typeof globalThis.process !== 'undefined' && globalThis.process.versions != null && globalThis.process.versions.node != null) {
    //         // Node.js environment
    //         return loadImage(buffer);
    //     } else {
    //         // Browser environment
    //         return new Promise((resolve, reject) => {
    //             const blob = new Blob([buffer]);
    //             const url = URL.createObjectURL(blob);
    //             const img = new Image();
    //             img.onload = () => {
    //                 URL.revokeObjectURL(url);
    //                 resolve(img);
    //             };
    //             img.onerror = (error) => {
    //                 URL.revokeObjectURL(url);
    //                 reject(error);
    //             };
    //             img.src = url;
    //         });
    //     }
    // }
    
    // private async _fetchImageAsBase64(ev: EventPayload, url: string): Promise<string> {
    //     try {
    //         const MAX_SIZE = 72;
    
    //         const response = await fetch(url);
    //         const arrayBuffer = await response.arrayBuffer();
    //         const buffer = Buffer.from(arrayBuffer);
    
    //         // Load remote image
    //         let img;
    //         try {
    //             img = await this.loadImageFromBuffer(buffer);
    //         } catch (error) {
    //             console.error('Error loading remote image:', error);
    //             throw error;
    //         }
    
    //         // Load local image
    //         const localImagePath = `imgs/actions/selectteam/teamSelect-t${ev.payload.settings.teamSide}.png`;
    //         let localImg;
    //         try {
    //             const localImageBuffer = await fs.readFile(localImagePath);
    //             localImg = await this.loadImageFromBuffer(localImageBuffer);
    //         } catch (error) {
    //             console.error('Error loading local image:', error);
    //             throw error;
    //         }
    
    //         // Function to resize an image while maintaining aspect ratio
    //         const resizeImage = (image: Image) => {
    //             const scale = Math.min(MAX_SIZE / image.width, MAX_SIZE / image.height);
    //             return {
    //                 width: Math.round(image.width * scale),
    //                 height: Math.round(image.height * scale),
    //             };
    //         };
    
    //         const imgSize = resizeImage(img);
    //         const localImgSize = resizeImage(localImg);
    
    //         // Create a fixed 128x128 canvas
    //         const canvas = createCanvas(MAX_SIZE, MAX_SIZE);
    //         const ctx = canvas.getContext('2d');
    
    //         // Calculate positions to center images
    //         const imgX = (MAX_SIZE - imgSize.width) / 2;
    //         const imgY = (MAX_SIZE - imgSize.height) / 2;
    //         const localImgX = (MAX_SIZE - localImgSize.width) / 2;
    //         const localImgY = (MAX_SIZE - localImgSize.height) / 2;
    
    //         // Draw images centered on the canvas
    //         ctx.drawImage(img, imgX, imgY, imgSize.width, imgSize.height);
    //         ctx.drawImage(localImg, localImgX, localImgY, localImgSize.width, localImgSize.height);
    
    //         return canvas.toDataURL('image/png');
    //     } catch (error) {
    //         console.error('Error in _fetchImageAsBase64:', error);
    //         throw error;
    //     }
    // }

    // using just the basic image
    // private async _fetchImageAsBase64(url: string): Promise<string> {
    //     const response = await fetch(url);
    //     const arrayBuffer = await response.arrayBuffer();
    //     return `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
    // }

    // layering the team logo on top of a base image
    // private async _fetchImageAsBase64ss(ev:EventPayload, url: string): Promise<string> {
    //     const test12 = "hmm"
    //     const MAX_SIZE = 72;
    
    //     const response = await fetch(url);
    //     const arrayBuffer = await response.arrayBuffer();
    //     const buffer = Buffer.from(arrayBuffer);
    
    // // PROBLEM IS LOAD IMAGE

    //     // // Load remote and local images
    //     const img = await loadImage(buffer);
    //     // const localImagePath = path.resolve('imgs/actions/selectteam/teamSelect-t1.png');
    //     // const localImagePath = path.resolve(`imgs/actions/selectteam/teamSelect-t${ev.payload.settings.teamSide}.png`);
    //     // const localImageBuffer = await fs.readFile(localImagePath);
    //     // const localImg = await loadImage(localImageBuffer);
    
    //     // // Function to resize an image while maintaining aspect ratio
    //     // const resizeImage = (image: any) => {
    //     //     const scale = Math.min(MAX_SIZE / image.width, MAX_SIZE / image.height);
    //     //     return {
    //     //         width: Math.round(image.width * scale),
    //     //         height: Math.round(image.height * scale),
    //     //     };
    //     // };
    
    //     // const imgSize = resizeImage(img);
    //     // const localImgSize = resizeImage(localImg);
    
    //     // // Create a fixed 128x128 canvas
    //     // const canvas = createCanvas(MAX_SIZE, MAX_SIZE);
    //     // const ctx = canvas.getContext('2d');
    
    //     // // Calculate positions to center images
    //     // const imgX = (MAX_SIZE - imgSize.width) / 2;
    //     // const imgY = (MAX_SIZE - imgSize.height) / 2;
    //     // const localImgX = (MAX_SIZE - localImgSize.width) / 2;
    //     // const localImgY = (MAX_SIZE - localImgSize.height) / 2;
    
    //     // // Draw images centered on the canvas
    //     // ctx.drawImage(img, imgX, imgY, imgSize.width, imgSize.height);
    //     // ctx.drawImage(localImg, localImgX, localImgY, localImgSize.width, localImgSize.height);
    
    //     // return canvas.toDataURL('image/png');
    //     return test12;

    // }

    override async onWillDisappear(ev: WillDisappearEvent<SelectTeamSettings>): Promise<void> {
        // Clean up if needed
    }
}

// Update the type definitions for better type safety
type SelectTeamSettings = {
    teamSide?: string;
    teamList?: string; // This will now store the team ID
    teamLogo?: string;
    teamName?: string; // Adding teamName to store the actual team name
};

type Team = {
    id: number;
    name: string;
    logo: string;
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


