import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent} from "@elgato/streamdeck";
import socket from '../websocket/socket';

@action({ UUID: "com.esportsdash.esportsdash-controller.setscore" })
export class SetScore extends SingletonAction<SetScoreSettings> {
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
            action.setTitle(isConnected ? `SET\nSCORE` : ``);
			action.setImage(isConnected ? '' : 'imgs/actions/disconnected.png');
        });
    }

    override onWillAppear(ev: WillAppearEvent<SetScoreSettings>): void | Promise<void> {
		return this.updateButtonTitle(socket.connected);
    }

    override async onKeyDown(ev: KeyDownEvent<SetScoreSettings>): Promise<void> {
        if (socket.connected) {
            // http://localhost:8080/api/setScore?team=1&score=5
            streamDeck.logger.info(`URL is: http://localhost:8080/api/setScore?team=${ev.payload.settings.teamSide}&score=${ev.payload.settings.teamScore}`);
            const response = await fetch(`http://localhost:8080/api/setScore?team=${ev.payload.settings.teamSide}&score=${ev.payload.settings.teamScore}`);
            const data = await response.json();
            streamDeck.logger.info('Set score response:', data);

            // set global settings for team score??? it should of been sent back though..

        } else {
			ev.action.showAlert();
		}
    }
}



type SetScoreSettings = {
    teamScore?: number;
    teamSide?: string;
};