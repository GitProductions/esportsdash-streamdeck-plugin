import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { EventEmitter } from 'events';
import socket from '../websocket/socket';




@action({ UUID: "com.esportsdash.esportsdash-controller.adjustscore" })
export class AdjustScore extends SingletonAction<CounterSettings> {
    public static eventEmitter = new EventEmitter();
    private team?: string;

    constructor() {
        super();

        // Setting Button Title/Status based on socket connection
        socket.on('connect', () => {
            this.updateConnectionState(true);
        });
        socket.on('disconnect', () => {
            this.updateConnectionState(false);
        });


    }



    private updateConnectionState(isConnected: boolean): void {
        this.actions.forEach(action => {
            action.setImage(isConnected ? '' : 'imgs/actions/disconnected.png');
        });
    }

    private async fetchTeamData(team: string): Promise<Partial<TeamData>> {
        try {
            // Fetch all necessary team data
            const [scoreResponse, nameResponse, logoUrlResponse] = await Promise.all([
                fetch(`http://localhost:8080/getValue?path=teams.team${team}.teamScore`),
                fetch(`http://localhost:8080/getValue?path=teams.team${team}.teamName`),
                fetch(`http://localhost:8080/getValue?path=teams.team${team}.teamLogoUrl`)
            ]);

            const scoreText = await scoreResponse.text();
            const teamName = await nameResponse.text();
            const logoUrl = await logoUrlResponse.text();

            return {
                score: scoreText ? Number(scoreText) : 0,
                name: teamName,
                logoUrl: logoUrl.trim()
            };
        } catch (error) {
            streamDeck.logger.error(`Failed to fetch data for team ${team}:`, error);
            throw error;
        }
    }

    private async fetchImageAsBase64(url: string): Promise<string> {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
        } catch (error) {
            streamDeck.logger.error(`Failed to fetch image from ${url}:`, error);
            throw error;
        }
    }

    private buildButtonTitle(settings: CounterSettings, score?: number, teamName?: string): string {
        const { includeOptions } = settings;
        const displayScore = score ?? settings.count ?? 0;
        const displayName = teamName ?? settings.teamName;

        let title = '';

        if (includeOptions?.includes('includeName') && displayName) {
            title += `${displayName}\n`;
        }

        if (includeOptions?.includes('includeScore')) {
            title += `${displayScore}`;
        }

        return title;
    }


    private async setButtonImage(action: any, settings: CounterSettings, logoUrl?: string): Promise<void> {
        const { team, includeOptions, operation } = settings;

        try {
            if (includeOptions?.includes('includeLogo') && team && logoUrl) {
                const base64Image = await this.fetchImageAsBase64(logoUrl);
                await action.setImage(base64Image);
            } else {
                // Set default button image based on operation
                let imagePath = 'imgs/actions/counter/button@2x.png';
                if (operation === 'increment') {
                    imagePath = 'imgs/actions/counter/button-positive@2x.png';
                } else if (operation === 'decrement') {
                    imagePath = 'imgs/actions/counter/button-negative@2x.png';
                }
                await action.setImage(imagePath);
            }
        } catch (error) {
            streamDeck.logger.error(`Failed to set button image:`, error);
        }
    }


    private async updateButtonState(ev: any, teamData?: Partial<TeamData>): Promise<void> {
        const { action, payload } = ev;
        const settings = payload.settings;
        const { team } = settings;

        if (!team) {
            await action.setTitle('Select Team');
            return;
        }

        try {
            // Update settings with new data
            if (teamData?.score !== undefined) settings.count = teamData.score;
            if (teamData?.name !== undefined) settings.teamName = teamData.name;

            // Update button title
            const title = this.buildButtonTitle(settings, teamData?.score, teamData?.name);
            await action.setTitle(title);

            // Update button image if logo URL is provided
            if (teamData?.logoUrl && settings.includeOptions?.includes('includeLogo')) {
                await this.setButtonImage(action, settings, teamData.logoUrl);
            }

            // Save settings
            await action.setSettings(settings);
        } catch (error) {
            streamDeck.logger.error(`Failed to update button state for team ${team}:`, error);
            await action.setTitle('Error\n\nCheck\nLogs');
        }
    }


    private setupEventListeners(ev: WillAppearEvent<CounterSettings> | DidReceiveSettingsEvent<CounterSettings>): void {
        const { team } = ev.payload.settings;
        if (!team) return;

        socket.on('updateMatchData', (data: MatchUpdate) => {
            if (data.type === 'teamUpdate' && data.teams) {
                Object.entries(data.teams).forEach(([teamKey, teamData]: [string, Partial<TeamData>]) => {
                    if (teamData.teamNumber === team || teamKey === `team${team}`) {

                        if (typeof teamData.teamScore !== 'undefined') {
                            this.updateButtonState(ev, { score: teamData.teamScore });
                        }

                        if (typeof teamData.teamLogoUrl !== 'undefined') {
                            this.updateButtonState(ev, { logoUrl: teamData.teamLogoUrl });
                        }

                        if (typeof teamData.teamName !== 'undefined') {
                            this.updateButtonState(ev, { name: teamData.teamName });
                        }

                    }
                }
                );
            }

        });

    }


    override async onWillAppear(ev: WillAppearEvent<CounterSettings>): Promise<void> {
        const { team, includeOptions } = ev.payload.settings;

        if (!socket.connected) {
            ev.action.showAlert();
            this.updateConnectionState(false);
            return;
        }

        if (!team) {
            streamDeck.logger.error('No team selected for this button');
            await ev.action.setTitle('No team');
            return;
        }

        this.team = team;

        try {
            // Fetch initial team data
            const teamData = await this.fetchTeamData(team);

            // Update button state with fetched data
            await this.updateButtonState(ev, teamData);

            // Setup event listeners
            this.setupEventListeners(ev);
        } catch (error) {
            streamDeck.logger.error(`Failed to initialize button for team ${team}:`, error);
            await ev.action.setTitle('Error\n\nCheck\nLogs');
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

        } catch (error) {
            ev.action.showAlert();
            streamDeck.logger.error(`Error updating score for team ${settings.team}:`, error);
        }
    }


    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<CounterSettings>): Promise<void> {
        const { team } = ev.payload.settings;

        if (!team) {
            await ev.action.setTitle('Select Team');
            return;
        }

        try {
            // Update the team property
            this.team = team;

            // Fetch fresh data and update button
            const teamData = await this.fetchTeamData(team);
            await this.updateButtonState(ev, teamData);

            // Update event listeners for the new team
            this.setupEventListeners(ev);
        } catch (error) {
            streamDeck.logger.error(`Error applying settings:`, error);
            ev.action.showAlert();
        }
    }


    override async onWillDisappear(ev: WillDisappearEvent<CounterSettings>): Promise<void> {
    }


}

type CounterSettings = {
    teamName?: string;
    count?: number;
    team?: string;
    operation?: string;
    includeOptions: string[];
};

interface TeamData {
    teamName: string;
    teamInfo: string;
    teamLogo: string;
    teamLogoUrl: string;
    teamScore: number;
    teamColor: string;
    teamGroup: string;
    players: any[];
    teamNumber: string;

    score: number;
    name: string;
    logoUrl: string;

}


interface MatchUpdate {
    type: 'teamUpdate';
    teams: {
        [key: string]: TeamData;
    };
    timestamp: number;
}
