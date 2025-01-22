import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

@action({ UUID: "com.esportsdash.esportsdash-controller.decrement" })
export class DecrementScore extends SingletonAction<CounterSettings> {

	override onWillAppear(ev: WillAppearEvent<CounterSettings>): void | Promise<void> {
		fetch(`http://localhost:8080/getValue?path=teams.team${ev.payload.settings.team}.teamScore`)
		.then(response => response.json())
		.then(dashScore => {
			let score = dashScore as number;
			// score += 1;
			streamDeck.logger.info(`Team Score: ${score}`);
			return ev.action.setTitle(`${score}`);
		});
	}

	override async onKeyDown(ev: KeyDownEvent<CounterSettings>): Promise<void> {
		const { settings } = ev.payload;
		// settings.count = (settings.count ?? 0) - 1;
	
		streamDeck.logger.info('Attempting to decrement score for team:', settings.team);

		if (settings.team === undefined || settings.team === '' || settings.team === null) {
			streamDeck.logger.error('No team selected');
			ev.action.setTitle('No team selected');
			return;
		}
	
		try {
			const updatedScore = await fetch(`http://localhost:8080/api/decrement?team=${settings.team}`);
			const scoreData = await updatedScore.json();
			settings.count = (scoreData as { score: number }).score;


			// await fetch('http://localhost:8080/api/updateMatchData');
			
			
			// settings.count = typeof updatedScore.score === 'number' ? updatedScore : settings.count;
			ev.action.setTitle(`${settings.count}`);


			streamDeck.logger.info('Update response:', settings.count);
		} catch (error) {
			streamDeck.logger.error('Error:', error);
		}
	
		console.log('Here is settings', settings.team);
	
		await ev.action.setSettings(settings);
		// await ev.action.showOk();
	}
}

/**
 * Settings for {@link DecrementScore}.
 */
type CounterSettings = {
	count?: number;
	incrementBy?: number;
	team?: string;
};
