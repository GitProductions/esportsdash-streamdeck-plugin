import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { EventEmitter } from 'events';
import socket from '../websocket/socket';

@action({ UUID: "com.esportsdash.esportsdash-controller.adjustscore" })
export class AdjustScore extends SingletonAction<CounterSettings> {
    private static instances: AdjustScore[] = [];
    public static eventEmitter = new EventEmitter();
    private team?: string;
    private pollingInterval?: NodeJS.Timeout;

    constructor() {
        super();
        AdjustScore.instances.push(this);

                // Setting Button Title/Status based on socket connection
                socket.on('connect', () => {
                    this.updateButtonTitle(true);
                });
                socket.on('disconnect', () => {
                    this.updateButtonTitle(false);
                });
    }

    private updateButtonTitle(isConnected: boolean): void {
        this.actions.forEach(action => {
			action.setImage(isConnected ? '' : 'imgs/actions/disconnected.png');
        });
    }

    private async _fetchTeamLogoUrl(team: string): Promise<string> {
        const response = await fetch(`http://localhost:8080/getValue?path=teams.team${team}.teamLogoUrl`);
        return response.text();
    }

    private async _fetchImageAsBase64(url: string): Promise<string> {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
    }


    private async setTeamIcon(team: string, action: any): Promise<void> {
        try {
            const teamLogoUrl = await this._fetchTeamLogoUrl(team);
            const base64Image = await this._fetchImageAsBase64(teamLogoUrl.trim());
            await action.setImage(base64Image);

            // emitting event to 'itself' to update
            AdjustScore.eventEmitter.emit(`logoUpdated:${team}`, teamLogoUrl);
        } catch (error) {
            streamDeck.logger.error(`Failed to set team icon for team ${team}:`, error);
        }
    }

    private async updateButtonState(ev: any, score?: number | null, teamName?: string): Promise<void> {
        const { team, includeOptions } = ev.payload.settings;

        streamDeck.logger.debug(`DEBUG: Updating button state for team ${team}, score: ${score}, teamName: ${teamName}`);

        try {
            // Use provided values or fall back to stored settings
            const displayScore = score ?? ev.payload.settings.count ?? 0;
            const displayName = teamName ?? ev.payload.settings.teamName;

            // Build title based on includeOptions
            let title = '';
            if (includeOptions?.includes('includeName') && displayName) {
                console.log("displayName: ", displayName);
                title += `${displayName}\n`;
            }
            if (includeOptions?.includes('includeScore')) {
                title += `${displayScore}`;
            }

            await ev.action.setTitle(title);

            // Update settings to keep track of current state
            const settings = ev.payload.settings;
            settings.count = displayScore;
            settings.teamName = displayName;
            await ev.action.setSettings(settings);

        } catch (error) {
            streamDeck.logger.error(`Failed to update button state for team ${team}:`, error);
            await ev.action.setTitle('Error\n\nCheck\nLogs');
        }
    }

    private async initializeButtonState(ev: any): Promise<void> {
        const { team, includeOptions, operation } = ev.payload.settings;

        if (!team) {
            await ev.action.setTitle('Select Team');
            return;
        }

        try {
            let score: number | undefined;
            let teamName: string | undefined;

            // Fetch initial data regardless of display options to ensure we have the data
            const scoreResponse = await fetch(`http://localhost:8080/getValue?path=teams.team${team}.teamScore`);
            const scoreText = await scoreResponse.text();
            score = scoreText ? Number(scoreText) : 0;

            const nameResponse = await fetch(`http://localhost:8080/getValue?path=teams.team${team}.teamName`);
            teamName = await nameResponse.text();

            // Set appropriate button image based on operation mode
            if (!includeOptions?.includes('includeLogo')) {
                if (operation === 'increment') {
                    await ev.action.setImage('imgs/actions/counter/button-positive@2x.png');
                } else if (operation === 'decrement') {
                    await ev.action.setImage('imgs/actions/counter/button-negative@2x.png');
                } else {
                    await ev.action.setImage('imgs/actions/counter/button@2x.png');
                }
            } else {
                await this.setTeamIcon(team, ev.action);
            }

            // Update the button state with fetched data
            await this.updateButtonState(ev, score, teamName);
        } catch (error) {
            streamDeck.logger.error(`Failed to initialize button state for team ${team}:`, error);
            await ev.action.setTitle('Error\n\nCheck\nLogs');
        }
    }

    override async onWillAppear(ev: WillAppearEvent<CounterSettings>): Promise<void> {
        const { team, includeOptions } = ev.payload.settings;

        if(!socket.connected) {
            ev.action.showAlert();
            this.updateButtonTitle(false);
            return;
        }

        if (!team) {
            streamDeck.logger.error('No team selected for this button');
            await ev.action.setTitle('No team');
            return;
        }
        this.team = team;

        try {
            // Initial state setup
            await this.initializeButtonState(ev);


            if (includeOptions?.includes('includeLogo')) {
                await this.setTeamIcon(team, ev.action);
            }


            AdjustScore.eventEmitter.on(`logoUpdated:${team}`, async (logoUrl: string) => {
                if (includeOptions?.includes('includeLogo')) {
                    const base64Image = await this._fetchImageAsBase64(logoUrl.trim());
                    await ev.action.setImage(base64Image);
                }
            });

            // Update event listeners in onWillAppear
            AdjustScore.eventEmitter.on(`scoreUpdated:${team}`, async (score: number) => {
                await this.updateButtonState(ev, score, ev.payload.settings.teamName);
            });

            AdjustScore.eventEmitter.on(`nameUpdated:${team}`, async (teamName: string) => {
                await this.updateButtonState(ev, ev.payload.settings.count, teamName);
            });

        } catch (error) {
            streamDeck.logger.error(`Failed to initialize button for team ${team}:`, error);
            await ev.action.setImage('imgs/actions/counter/button@2x.png');
        }
    }

    override async onKeyDown(ev: KeyDownEvent<CounterSettings>): Promise<void> {
        const { settings } = ev.payload;
        if (!settings.team) {
            streamDeck.logger.error('No team selected');
            ev.action.setTitle('Select Team');
            return;
        }

        // Don't process key presses for display-only mode
        if (settings.operation === 'display') {
            return;
        }

        try {
            const response = await fetch(`http://localhost:8080/api/${settings.operation}?team=${settings.team}`);
            const { score } = await response.json() as { score: number };
            settings.count = score;
            await ev.action.setSettings(settings);
            AdjustScore.eventEmitter.emit(`scoreUpdated:${settings.team}`, score);
        } catch (error) {
            ev.action.showAlert();
            streamDeck.logger.error(`Error updating score for team ${settings.team}:`, error);
        }
    }

    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<CounterSettings>): Promise<void> {
        const { team, includeOptions, operation } = ev.payload.settings;

        if (!team) {
            await ev.action.setTitle('Select Team');
            return;
        }

        try {
            // Always initialize the button state when settings change
            await this.initializeButtonState(ev);
        } catch (error) {
            streamDeck.logger.error(`Error applying settings:`, error);
            ev.action.showAlert();
        }
    }

    override async onWillDisappear(ev: WillDisappearEvent<CounterSettings>): Promise<void> {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        if (this.team) {
            AdjustScore.eventEmitter.removeAllListeners(`scoreUpdated:${this.team}`);
            AdjustScore.eventEmitter.removeAllListeners(`logoUpdated:${this.team}`);
            AdjustScore.eventEmitter.removeAllListeners(`nameUpdated:${this.team}`);
        }
        AdjustScore.instances = AdjustScore.instances.filter(instance => instance !== this);
    }
}

type CounterSettings = {
    teamName?: string;
    count?: number;
    team?: string;
    operation?: string;
    includeOptions: string[];
};