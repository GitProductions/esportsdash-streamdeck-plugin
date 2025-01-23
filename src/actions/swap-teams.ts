import { action, KeyDownEvent, SingletonAction, WillAppearEvent} from "@elgato/streamdeck";
import socket from '../websocket/socket';

@action({ UUID: "com.esportsdash.esportsdash-controller.swapteams" })
export class SwapTeams extends SingletonAction {
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
            action.setTitle(isConnected ? `SWAP\nTEAMS` : ``);
			action.setImage(isConnected ? '' : 'imgs/actions/disconnected.png');
        });
    }

    override onWillAppear(ev: WillAppearEvent): void | Promise<void> {
		return this.updateButtonTitle(socket.connected);
    }

    override async onKeyDown(ev: KeyDownEvent): Promise<void> {
        if (socket.connected) {
            await fetch('http://localhost:8080/api/swapTeams');
        } else {
			ev.action.showAlert();
		}
    }
}