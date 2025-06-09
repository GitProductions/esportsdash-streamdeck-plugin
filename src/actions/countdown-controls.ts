import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent} from "@elgato/streamdeck";
import socket from '../websocket/socket';


@action({ UUID: "com.esportsdash.esportsdash-controller.countdowncontrols" })
export class CountdownControls extends SingletonAction<CountdownControlSettings> {
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
			action.setImage(isConnected ? '' : 'imgs/actions/disconnected.png');
        });
    }

	override async onWillAppear(ev: WillAppearEvent<CountdownControlSettings>): Promise<void> {
        const action = ev.payload.settings?.action;

        if (!socket.connected) {
            this.updateButtonTitle(false);
            ev.action.showAlert();
        }
        
        if (!action) {
            await ev.action.setTitle('Select\nOperation');
            return;
        }

        try {
            await ev.action.setTitle(actionDisplayMap[action]);
        } catch (error) {
            streamDeck.logger.error('Failed to set title:', error);
            await ev.action.setTitle('Error');
        }
	}

	override async onKeyDown(ev: KeyDownEvent<CountdownControlSettings>): Promise<void> {
		if (ev.payload.settings.action) {

			streamDeck.logger.info(`Countdown Controls Action: ${ev.payload.settings.action}`);
            // in future it wil be api/window/${ev.payload.settings.operation}
        	fetch(`http://localhost:8080/api/countdown/?action=${ev.payload.settings.action}`)
		}

	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<CountdownControlSettings>): Promise<void> {
		const { action } = ev.payload.settings;
		if (!action) {
			streamDeck.logger.error('No operation selected');
			ev.action.setTitle('No operation');
			return;
		}

		try {
			// show key of the operation
			await ev.action.setTitle(actionDisplayMap[action].replace(' ', '\n'));
			// await ev.action.setTitle(operation);
		} catch (error) {
			streamDeck.logger.error(`Failed to initialize button for operation ${action}:`, error);
		}
		
	}

	
}



type ActionType = 
    | 'start'
    | 'stop'
    | 'pause'
    | 'reset'
    | 'togglevisibility'
    | 'add'


type CountdownControlSettings = {
    action: ActionType;
    value?: number; 
};

const actionDisplayMap: Record<ActionType, string> = {
    'start': 'Start\nCountdown',
    'stop': 'Stop\nCountdown',
    'pause': 'Pause\nCountdown',
    'reset': 'Reset\nCountdown',
    'togglevisibility': 'Toggle\nVisibility',
    'add': 'Add\nTime'
};