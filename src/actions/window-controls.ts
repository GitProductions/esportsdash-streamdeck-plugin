import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent} from "@elgato/streamdeck";



@action({ UUID: "com.esportsdash.esportsdash-controller.windowcontrols" })
export class WindowControls extends SingletonAction<WindowControlSettings> {
	override async onWillAppear(ev: WillAppearEvent<WindowControlSettings>): Promise<void> {
        const operation = ev.payload.settings?.operation;
        
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

	override async onKeyDown(ev: KeyDownEvent<WindowControlSettings>): Promise<void> {
		if (ev.payload.settings.operation) {

			streamDeck.logger.info(`Window Controls Trigger: ${ev.payload.settings.operation}`);

        	fetch(`http://localhost:8080/api/${ev.payload.settings.operation}`)
		}

	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<WindowControlSettings>): Promise<void> {
		const { operation } = ev.payload.settings;
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



type OperationType = 
    | 'toggleWindow' 
    | 'minimizeWindow' 
    | 'closeWindow' 
    | 'openWindow' 
    | 'toggleOrientation' 
    | 'hotkeyManager' 
    | 'checkForUpdates';

type WindowControlSettings = {
    operation: OperationType;
};

const operationDisplayMap: Record<OperationType, string> = {
    'toggleWindow': 'Toggle\nWindow',
    'minimizeWindow': 'Minimize\nWindow',
    'closeWindow': 'Close\nWindow',
    'openWindow': 'Open\nWindow',
    'toggleOrientation': 'Toggle\nOrientation',
    'hotkeyManager': 'Hotkey\nManager',
    'checkForUpdates': 'Check\nUpdates'
};