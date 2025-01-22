import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { EventEmitter } from 'events';

@action({ UUID: "com.esportsdash.esportsdash-controller.adjustscore" })
export class AdjustScore extends SingletonAction<CounterSettings> {
    private static instances: AdjustScore[] = [];
    public static eventEmitter = new EventEmitter();
    private team?: string;
    private pollingInterval?: NodeJS.Timeout;

    constructor() {
        super();
        AdjustScore.instances.push(this);
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
        const teamLogoUrl = await this._fetchTeamLogoUrl(team);
        const base64Image = await this._fetchImageAsBase64(teamLogoUrl.trim());
        await action.setImage(base64Image);
    }

    private async setInitialScore(team: string, action: any): Promise<void> {
        try {
            const response = await fetch(`http://localhost:8080/getValue?path=teams.team${team}.teamScore`);
            const score = await response.json() as number;
            action.setTitle(`${score}`);
            AdjustScore.eventEmitter.emit(`scoreUpdated:${team}`, score);
        } catch (error) {
            streamDeck.logger.error(`Failed to fetch initial score for team ${team}:`, error);
            action.setTitle('Error');
        }
    }


	// we should check to make sure its different before wasting resources on changing it.. so lets save a 'previous' or reference..

	private async fetchAndUpdateScore(ev: WillAppearEvent<CounterSettings>): Promise<void> {
		const { team } = ev.payload.settings;
		if (!team) return;
	
		try {
			const response = await fetch(`http://localhost:8080/getValue?path=teams.team${team}`);
			const data = await response.json() as TeamResponse;  // Assert the type here
	
			const teamScore = data.teamScore; // Extract teamScore
			const teamLogoUrl = data.teamLogoUrl; // Extract teamColor
	
			// Set the score
			ev.action.setTitle(`${teamScore}`);

			if (teamLogoUrl && ev.payload.settings.includeLogo) {
				const base64Image = await this._fetchImageAsBase64(teamLogoUrl.trim());
				await ev.action.setImage(base64Image);
			}

	
			// Set the team color if needed (e.g., change background color based on team color)
			// if (teamColor) {
			// 	ev.action.setBackgroundColor(teamColor);  // Update background color with teamColor
			// }
	
			AdjustScore.eventEmitter.emit(`scoreUpdated:${team}`, teamScore);
		} catch (error) {
			streamDeck.logger.error(`Error fetching score and color for team ${team}:`, error);
		}
	}
	
	
    override async onWillAppear(ev: WillAppearEvent<CounterSettings>): Promise<void> {
        const { team, includeLogo } = ev.payload.settings;
        if (!team) {
            streamDeck.logger.error('No team selected for this button');
            await ev.action.setTitle('No team');
            return;
        }
        this.team = team;

        try {
            if (includeLogo) {
                await this.setTeamIcon(team, ev.action);
            }
            await this.setInitialScore(team, ev.action);
        } catch (error) {
            streamDeck.logger.error(`Failed to initialize button for team ${team}:`, error);
            await ev.action.setImage('imgs/actions/counter/icon@2x.png');
        }

        AdjustScore.eventEmitter.on(`scoreUpdated:${team}`, (score: number) => {
            ev.action.setTitle(`${score}`);
        });

        // Start polling for score updates every 5 seconds
        this.pollingInterval = setInterval(() => this.fetchAndUpdateScore(ev), 25000);
    }

    override async onKeyDown(ev: KeyDownEvent<CounterSettings>): Promise<void> {
        const { settings } = ev.payload;
        if (!settings.team) {
            streamDeck.logger.error('No team selected');
            ev.action.setTitle('No team');
            return;
        }

        try {
            const response = await fetch(`http://localhost:8080/api/${settings.operation}?team=${settings.team}`);
            const { score } = await response.json() as { score: number };
            settings.count = score;
            await ev.action.setSettings(settings);
            AdjustScore.eventEmitter.emit(`scoreUpdated:${settings.team}`, score);
        } catch (error) {
            streamDeck.logger.error(`Error updating score for team ${settings.team}:`, error);
        }
    }

    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<CounterSettings>): Promise<void> {
        const { team } = ev.payload.settings;
        if (!team) {
            streamDeck.logger.error('No team selected');
            ev.action.setTitle('No team');
            return;
        }

        try {
            await this.setInitialScore(team, ev.action);
			
			if (ev.payload.settings.includeLogo) {
            	await this.setTeamIcon(team, ev.action);
			} else {
				await ev.action.setImage('');  // Clear the image
			}
        } catch (error) {
            streamDeck.logger.error(`Failed to initialize button for team ${team}:`, error);
        }
    }

    override async onWillDisappear(ev: WillDisappearEvent<CounterSettings>): Promise<void> {
        // Clean up polling when the button disappears
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        AdjustScore.instances = AdjustScore.instances.filter(instance => instance !== this);
        AdjustScore.eventEmitter.removeAllListeners(`scoreUpdated:${this.team}`);
    }
}


interface TeamResponse {
    teamScore: number;
    teamLogoUrl: string; 
}

type CounterSettings = {
    count?: number;
    team?: string;
    operation?: string;
    includeLogo?: boolean;
};
