import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import socket from '../websocket/socket';
import { EventPayload, SelectTeamSettings, Team, Data } from '../types/types';

import { ImageLoader } from '../utils/image-loader';



let fullTeamList: Team[] = [];

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

        // Listen for global settings updates ie things from the esportsdash socket
        streamDeck.settings.onDidReceiveGlobalSettings(async (event) => {
            const settings = event.settings;
            if (settings?.teamList && Array.isArray(settings.teamList)) {
                streamDeck.logger.info('Updating team list from global settings');
                this.teams = settings.teamList as Team[];
                
                // if (this.teams.length > 0 && ev.payload.settings.teamList) {
                //     await this.setButtonInfo(ev);
                // }
            }
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
                // const base64Image = await ImageLoader.processImage(selectedTeam.logo);
                const base64Image = await ImageLoader._fetchImageAsBase64ss(ev, selectedTeam.logo);
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
            return;
        } catch (error) {
            streamDeck.logger.error('Error in setButtonInfo:', error);
            ev.action.setTitle('Error');
        }
    }






    
    override async onWillAppear(ev: WillAppearEvent<SelectTeamSettings>): Promise<void> {
        if(!socket.connected) {
            ev.action.showAlert();
            this.updateButtonTitle(false);
            return;
        }

        try {
            // Initialize teams from global settings
            const globalSettings = await streamDeck.settings.getGlobalSettings();
            if (globalSettings?.teamList && Array.isArray(globalSettings.teamList)) {
                streamDeck.logger.info('Setting initial team list');
                this.teams = globalSettings.teamList as Team[];
                
                if (ev.payload.settings.teamList) {
                    await this.setButtonInfo(ev);
                }
            }



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

