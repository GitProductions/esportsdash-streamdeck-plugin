import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { EventEmitter } from 'events';

@action({ UUID: "com.esportsdash.esportsdash-controller.increment" })
export class IncrementScore extends SingletonAction<CounterSettings> {

	private static eventEmitter = new EventEmitter();

	override onWillAppear(ev: WillAppearEvent<CounterSettings>): void | Promise<void> {
		// Fetch initial score and set the title
		if (ev.payload.settings.team) {
			this.setInitialTitle(ev.payload.settings.team);
		}

		// Listen for score updates
		IncrementScore.eventEmitter.on('scoreUpdated', ({ team, score }) => {
			if (ev.payload.settings.team === team) {
				ev.action.setTitle(`${score}`);
			}
		});
	}

	override async onKeyDown(ev: KeyDownEvent<CounterSettings>): Promise<void> {
		const { settings } = ev.payload;

		if (!settings.team) {
			streamDeck.logger.error('No team selected');
			ev.action.setTitle('No team selected');
			return;
		}

		try {
			const response = await fetch(`http://localhost:8080/api/${settings.operation}?team=${settings.team}`);
			const scoreData = await response.json();
			const newScore = (scoreData as { score: number }).score;


			settings.count = newScore;
			ev.action.setTitle(`${newScore}`);
			await ev.action.setSettings(settings);

			// Emit the event to update all buttons for this team
			IncrementScore.eventEmitter.emit('scoreUpdated', { team: settings.team, score: newScore });
		} catch (error) {
			streamDeck.logger.error('Error:', error);
		}
	}

	private setInitialTitle(team: string): void {
		fetch(`http://localhost:8080/getValue?path=teams.team${team}.teamScore`)
			.then(response => response.json())
			.then(dashScore => {
				const score = dashScore as number;
				IncrementScore.eventEmitter.emit('scoreUpdated', { team, score });
			});
	}
}

/**
 * Settings for {@link IncrementScore}.
 */
type CounterSettings = {
	count?: number;
	team?: string;
	operation?: string;
};
