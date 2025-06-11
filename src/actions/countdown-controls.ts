import streamDeck, { action, type KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import { type JsonValue, type SendToPluginEvent } from "@elgato/streamdeck";
import socket from '../websocket/socket';
import type { DataSourcePayload, DataSourceResult } from "../sdpi";


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
        const value = ev.payload.settings?.value;

        if (!socket.connected) {
            this.updateButtonTitle(false);
            ev.action.showAlert();
        }

        if (!action) {
            await ev.action.setTitle('Select\nOperation');
            return;
        }

        try {
            if (value !== undefined) {
                await ev.action.setTitle(`${actionDisplayMap[action]}\n ${value}`);
            } else {
                await ev.action.setTitle(actionDisplayMap[action]);
            }
        } catch (error) {
            streamDeck.logger.error('Failed to set title:', error);
            await ev.action.setTitle('Error');
        }
    }

    override async onKeyDown(ev: KeyDownEvent<CountdownControlSettings>): Promise<void> {
        if (ev.payload.settings.action) {
            streamDeck.logger.info(`Countdown Controls Action: ${ev.payload.settings.action}`);
            if (ev.payload.settings.action === 'add' || ev.payload.settings.action === 'subtract') {
                const value = ev.payload.settings.value ?? 0;
                fetch(`http://localhost:8080/api/countdown/?action=${ev.payload.settings.action}&value=${value}`);
            } else {
                fetch(`http://localhost:8080/api/countdown/?action=${ev.payload.settings.action}`);
            }
        }
    }

    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<CountdownControlSettings>): Promise<void> {
        const { action, value } = ev.payload.settings;
        if (!action) {
            streamDeck.logger.error('No operation selected');
            ev.action.setTitle('No operation');
            return;
        }

        this.setupEventListeners(ev);


        try {
            // show key of the operation
            if (value !== undefined) {
                await ev.action.setTitle(`${actionDisplayMap[action]}\n ${value}`);
            }
            else {
                await ev.action.setTitle(actionDisplayMap[action].replace(' ', '\n'));
            }
            // await ev.action.setTitle(operation);
        } catch (error) {
            streamDeck.logger.error(`Failed to initialize button for operation ${action}:`, error);
        }

    }

    // override onSendToPlugin(ev: SendToPluginEvent<JsonValue, CountdownControlSettings>): Promise<void> | void {
    // 	// Check if the payload is requesting a data source, i.e. the structure is { event: string }
    // 	if (ev.payload instanceof Object && "event" in ev.payload && ev.payload.event === "getProducts") {
    // 		// Send the product ranges to the property inspector.
    // 		streamDeck.ui.current?.sendToPropertyInspector({
    // 			event: "getProducts",
    // 			items: this.#getStreamDeckProducts(),
    // 		} satisfies DataSourcePayload);
    // 	}
    // }


    // #getStreamDeckProducts(): DataSourceResult {
    // 	return [
    // 		{
    // 			value: "https://www.elgato.com/uk/en/p/stream-deck-plus",
    // 			label: "Stream Deck +",
    // 		},
    // 		{
    // 			value: "https://www.elgato.com/uk/en/p/stream-deck-mini",
    // 			label: "Stream Deck Mini",
    // 		},
    // 		{
    // 			value: "https://www.elgato.com/uk/en/p/stream-deck",
    // 			label: "Stream Deck MK.2",
    // 		},
    // 		{
    // 			value: "https://www.elgato.com/uk/en/p/stream-deck-neo",
    // 			label: "Stream Deck Neo",
    // 		},
    // 		{
    // 			value: "https://www.elgato.com/uk/en/p/stream-deck-pedal",
    // 			label: "Stream Deck Pedal",
    // 		},
    // 		{
    // 			value: "https://www.elgato.com/uk/en/p/stream-deck-scissor-keys",
    // 			label: "Stream Deck Scissor Keys",
    // 		},
    // 		{
    // 			value: "https://www.elgato.com/uk/en/p/stream-deck-xl",
    // 			label: "Stream Deck XL",
    // 		},
    // 	];
    // }





    private setupEventListeners(ev: WillAppearEvent<CountdownControlSettings> | DidReceiveSettingsEvent<CountdownControlSettings>): void {


        // socket.on('updateMatchData', (data: MatchUpdate) => {
        //     if (data.type === 'teamUpdate' && data.teams) {
        //         Object.entries(data.teams).forEach(([teamKey, teamData]: [string, Partial<TeamData>]) => {
        //             if (teamData.teamNumber === team || teamKey === `team${team}`) {


        //                 // old method if sending updates when we were in plugin.ts
        //                 // AdjustScore.eventEmitter.emit('teamUpdate', {
        //                 //     teamNumber: teamData.teamNumber,
        //                 //     changes: teamData
        //                 // });

        //                 if (typeof teamData.teamScore !== 'undefined') {
        //                     this.updateButtonState(ev, { score: teamData.teamScore });
        //                 }

        //                 if (typeof teamData.teamLogoUrl !== 'undefined') {
        //                     this.updateButtonState(ev, { logoUrl: teamData.teamLogoUrl });
        //                 }

        //                 if (typeof teamData.teamName !== 'undefined') {
        //                     this.updateButtonState(ev, { name: teamData.teamName });
        //                 }

        //             }
        //         }
        //         );
        //     }

        // });


        // only way i know how to get other buttons that are similar to update as well.....
        // sure we could emit a global socket event for this.. but it feels like there has to be another way..

        // Setup score update listener

    }   
}


type CountdownData = {
    seconds: number;
    data: string; 
}

type ActionType =
    | 'start'
    | 'stop'
    | 'pause'
    | 'reset'
    | 'togglevisibility'
    | 'add'
    | 'subtract';


type CountdownControlSettings = {
    action: ActionType;
    value?: number;

    // For Example of dynamically updating the inspector
    // product?: string
};

const actionDisplayMap: Record<ActionType, string> = {
    'start': 'Start\nCountdown',
    'stop': 'Stop\nCountdown',
    'pause': 'Pause\nCountdown',
    'reset': 'Reset\nCountdown',
    'togglevisibility': 'Toggle\nVisibility',
    'add': 'Add',
    'subtract': 'Subtract'
};