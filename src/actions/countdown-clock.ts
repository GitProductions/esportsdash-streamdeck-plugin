import streamDeck, { action, type KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import socket from '../websocket/socket';


// We need to be able to take arguments for the countdown clock where user selects from dropdown for time format
// and then we set the value based on that selection.

// onDidReceiveSettingsEvent will be used to update the action settings when user changes the dropdown selection
// and then we should be able to use that to set the title of the button




@action({ UUID: "com.esportsdash.esportsdash-controller.countdownclock" })
export class CountdownClock extends SingletonAction<CountdownClockSettings> {
    constructor() {
        super();

        socket.on('connect', () => {

            socket.emit('joinRoom', {
                room: 'overlay',
                source: 'streamDeck'
            });
            this.updateButtonTitle(true);

        });

        socket.on('disconnect', () => {
            this.updateButtonTitle(false);
        });

        socket.on('countDownTimer', this.handleCountdownData);


    }
    private updateButtonTitle(isConnected: boolean): void {
        this.actions.forEach(action => {
            action.setImage(isConnected ? '' : 'imgs/actions/disconnected.png');
        });
    }

    override async onWillAppear(ev: WillAppearEvent): Promise<void> {
        if (!socket.connected) {
            this.updateButtonTitle(false);
            ev.action.showAlert();
        }
        await ev.action.setTitle('Clock\nCountdown');

    }

    override async onKeyDown(ev: KeyDownEvent): Promise<void> {

    }

    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<CountdownClockSettings>): Promise<void> {
        const { timeformat, value } = ev.payload.settings;
        await ev.action.setTitle('0:00');
        // if (!timeformat) {
        //     streamDeck.logger.error('No operation selected');
        //     ev.action.setTitle('No operation');
        //     return;
        // } else {
        //     streamDeck.logger.info(`Received settings for action: ${timeformat} with value: ${value}`);
        //     if (value !== undefined) {
        //         await ev.action.setTitle(`${timeformat}\n${value}`);
        //     } else {
        //         await ev.action.setTitle(`${timeformat}`);
        //     }
        // }
    }


    private handleCountdownData = (data: CountdownData): void => {
        const { countdown } = data.data;

        const minutes = Math.floor(countdown / 60);
        const seconds = countdown % 60;
        const formattedCD = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        

        this.actions.forEach(action => {
            action.setTitle(`${formattedCD}`);
            streamDeck.logger.info(`Setting title for action ${action} to ${countdown}`);

            // streamDeck.logger.info(`Action settings:`, action.getSettings());
        });
    }
}


type CountdownData = {
    data: {
        countdown: number;
        countdownStatus: 'running' | 'paused' | 'stopped';
        finalMessage: string;
        options: {
            movieCountdown: boolean;
            finishMessage: string;
            isVisible: boolean;
            criticalThreshold: {
                value: number;
                color: string;
            };
            warningThreshold: {
                value: number;
                color: string;
            };
        };
    }

}

type FormatType =
    | 'hh:mm:ss'
    | 'mm:ss'


type CountdownClockSettings = {
    timeformat: FormatType;
    value?: number;
};

