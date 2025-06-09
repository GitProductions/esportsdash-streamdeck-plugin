import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent} from "@elgato/streamdeck";
import socket from '../websocket/socket';


@action({ UUID: "com.esportsdash.esportsdash-controller.countdowncontrols" })
export class WindowControls extends SingletonAction<CountdownControlSettings> {
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
        const operation = ev.payload.settings?.action;

        if (!socket.connected) {
            this.updateButtonTitle(false);
            ev.action.showAlert();
        }
        
        if (!operation) {
            await ev.action.setTitle('Select\nOperation');
            return;
        }

        try {
            await ev.action.setTitle(operationDisplayMap[operation]);
        } catch (error) {
            streamDeck.logger.error('Failed to set title:', error);
            await ev.action.setTitle('Error');
        }
	}

	override async onKeyDown(ev: KeyDownEvent<CountdownControlSettings>): Promise<void> {
		if (ev.payload.settings.action) {

			streamDeck.logger.info(`Window Controls Trigger: ${ev.payload.settings.action}`);
            // in future it wil be api/window/${ev.payload.settings.operation}
        	fetch(`http://localhost:8080/api/countdown/${ev.payload.settings.action}`)
		}

	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<CountdownControlSettings>): Promise<void> {
		const { action: operation } = ev.payload.settings;
		if (!operation) {
			streamDeck.logger.error('No operation selected');
			ev.action.setTitle('No operation');
			return;
		}

		try {
			// show key of the operation
			await ev.action.setTitle(operationDisplayMap[operation].replace(' ', '\n'));
			// await ev.action.setTitle(operation);
		} catch (error) {
			streamDeck.logger.error(`Failed to initialize button for operation ${operation}:`, error);
		}
		
	}

	
}



type ActionType = 
    | 'start'
    | 'stop'
    | 'pause'
    | 'reset'


type CountdownControlSettings = {
    action: ActionType;
    value?: number; 
};

const operationDisplayMap: Record<ActionType, string> = {
    'start': 'Start\nCountdown',
    'stop': 'Stop\nCountdown',
    'pause': 'Pause\nCountdown',
    'reset': 'Reset\nCountdown',
};