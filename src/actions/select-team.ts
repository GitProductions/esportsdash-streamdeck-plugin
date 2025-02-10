import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import socket from '../websocket/socket';
import { ImageLoader } from '../utils/image-loader';

import sharp from 'sharp';


let fullTeamList: Team[] = [];

let fakeTeamList = [
    {
        id: '1',
        name: 'Cat 1',
        logo: 'https://placecats.com/200/200'
    },
    {
        id: '2',
        name: 'Cat 2',
        logo: 'https://placecats.com/200/200'
    },
    {
        id: '3',
        name: 'Cat 3',
        logo: 'https://placecats.com/200/200'
    },
    {
        id: '4',
        name: 'Cat 4',
        logo: 'https://placecats.com/200/200'
    }   
];

interface GlobalSettings {
    teamList: Team[];
    [key: string]: any;
}

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

        if (!teamList || !teamSide || !this.teams || this.teams.length === 0) {
            ev.action.setTitle('Select\nTeam');
            return;
        }

        try {
            streamDeck.logger.info(`Looking for team ID: ${teamList} in ${this.teams.length} teams`);
            const selectedTeam = this.teams.find(t => t.id === teamList);

            if (!selectedTeam) {
                streamDeck.logger.error(`Team not found with ID: ${teamList}`);
                streamDeck.logger.error('Available team IDs:', this.teams.map(t => t.id));
                ev.action.setTitle('Invalid\nTeam');
                return;
            }

            // Set the button title with team information
            ev.action.setTitle(`SELECT\n${selectedTeam.name}`);

            // Process and set the team logo
            try {
                const base64Image = await ImageLoader.processImage(selectedTeam.logo);
                await ev.action.setImage(base64Image);
            } catch (imageError) {
                streamDeck.logger.error('Image processing error:', imageError);
                await ev.action.setImage('imgs/actions/selectteam/default.png');
            }

            // Update settings with complete team data
            const updatedSettings = {
                ...ev.payload.settings,
                teamLogo: selectedTeam.logo,
                teamName: selectedTeam.name,
                teamId: selectedTeam.id
            };
            await ev.action.setSettings(updatedSettings);

        } catch (error) {
            streamDeck.logger.error('Error in setButtonInfo:', error);
            ev.action.setTitle('Error');
        }
    }

    override async onWillAppear(ev: WillAppearEvent<SelectTeamSettings>): Promise<void> {
        this.updateButtonTitle(socket.connected);

        try {
            // Initialize teams from global settings
            const globalSettings = await streamDeck.settings.getGlobalSettings() as GlobalSettings;
            if (globalSettings?.teamList && Array.isArray(globalSettings.teamList)) {
                streamDeck.logger.info('Setting initial team list');
                this.teams = globalSettings.teamList as Team[];
                
                if (ev.payload.settings.teamList) {
                    await this.setButtonInfo(ev);
                }
            }

            // Listen for global settings updates
            streamDeck.settings.onDidReceiveGlobalSettings(async (event) => {
                const settings = event.settings as GlobalSettings;
                if (settings?.teamList && Array.isArray(settings.teamList)) {
                    streamDeck.logger.info('Updating team list from global settings');
                    this.teams = settings.teamList as Team[];
                    
                    if (this.teams.length > 0 && ev.payload.settings.teamList) {
                        await this.setButtonInfo(ev);
                    }
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
        
        // Ensure we refresh the image when settings change
        if (ev.payload.settings.teamList) {
            await this.setButtonInfo(ev);
        }
    }

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
    teamId?: string;
};

type Team = {
    id: string; 
    name: string;
    logo: string;
    color?: string;
    players?: any[];
    gameRosters?: any[];
    createdAt?: number;
    updatedAt?: number;
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


