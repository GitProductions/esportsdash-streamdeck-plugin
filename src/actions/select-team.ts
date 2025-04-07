import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import socket from '../websocket/socket';
import { EventPayload, SelectTeamSettings, Team, Data } from '../types/types';
import { ImageLoader } from '../utils/image-loader';

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


        // Notes on onDidReceiveGlobalSettings behavior:
        // - Was firing 3x per button on startup
        // - Moving to onWillAppear causes excessive firing due to repeated listener registration.
        // - Only triggers via getGlobalSettings or Property Inspector updates, not setGlobalSettings alone.
        // - Property Inspector is the Stream Deck UI; plugin.js sets globals but needs getGlobalSettings to notify actions.
        // - Workaround: After setGlobalSettings in plugin.js, call getGlobalSettings to fire this event.
        // - Docs confirm it’s tied to getGlobalSettings or UI updates, not passive changes.
        // - Keep in constructor to avoid over-firing; fetch in onWillAppear if needed.
        // - Multiple firings match number of action instances (buttons).
        // - Stable solution: set globals, fetch globals, update buttons.

        streamDeck.settings.onDidReceiveGlobalSettings(async (event) => {
            const settings = event.settings;

            if (settings?.teamList && Array.isArray(settings.teamList)) {
                streamDeck.logger.info('Updating team list from global settings');
                this.teams = settings.teamList as Team[];

            } else {
                streamDeck.logger.warn('No valid teamList in global settings');
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
        const { teamSide, teamList, showTeamName } = ev.payload.settings;

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

            if (showTeamName) {
                ev.action.setTitle(`SELECT\n${selectedTeam.name}`);
            } else {
                ev.action.setTitle(``);
            }

            // ev.action.setTitle(`SELECT\n${selectedTeam.name}`);

            try {
                const base64Image = await ImageLoader._fetchImageAsBase64ss(ev, selectedTeam.logo);
                await ev.action.setImage(base64Image);
            } catch (imageError) {
                streamDeck.logger.error('Image processing error:', imageError);
                await ev.action.setImage('imgs/actions/selectteam/default.png');
            }

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
        // the global settings event is firing we dont seem to need this
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

        if (ev.payload.settings.teamList) {
            await this.setButtonInfo(ev);
        }
    }

    override async onWillDisappear(ev: WillDisappearEvent<SelectTeamSettings>): Promise<void> {
        // No listener cleanup needed since it's only set once in constructor
    }
}