import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import socket from '../websocket/socket';


@action({ UUID: "com.esportsdash.esportsdash-controller.setteamname" })
export class SetTeamName extends SingletonAction<SetTeamSettings> {
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
            action.setTitle(isConnected ? `SET\nTEAM NAME` : ``);
			action.setImage(isConnected ? '' : 'imgs/actions/disconnected.png');  
        });
    }

    private setButtonTitle(ev: EventPayload): void {
        const { teamSide, teamName } = ev.payload.settings;
        if (!teamSide && !teamName) {
            ev.action.setTitle(`SET\nTEAM NAME`);
            return;
        }

        if (!teamSide) {
            ev.action.setTitle(`Select\nTeam Side`);
            return;
        }

        const displayName = teamName ?? 'Default Name';
        ev.action.setTitle(`Team${teamSide}:\n${displayName.split(' ').join('\n')}`);
        streamDeck.logger.info('SelectTeam action will appear:', ev);
    }

    

    override onWillAppear(ev: WillAppearEvent<SetTeamSettings>): void | Promise<void> {
        if (ev.payload.settings.teamName === undefined && ev.payload.settings.teamSide === undefined) {
            this.updateButtonTitle(socket.connected);
            return;
        }
        this.setButtonTitle(ev);
    }



    override async onKeyDown(ev: KeyDownEvent<SetTeamSettings>): Promise<void> {
        if (!socket.connected) {
            ev.action.showAlert();
            return;
        }
        const { settings } = ev.payload;
        const response = await fetch(`http://localhost:8080/api/setTeamName?team=${settings.teamSide}&name=${settings.teamName}`);
        const data = await response.json() as Data;

        if (data.status === 'error') {
            ev.action.showAlert();
            return;
        }
        ev.action.showOk();
        streamDeck.logger.info('Set team name response:', data);
    }

    override async onWillDisappear(ev: WillDisappearEvent<SetTeamSettings>): Promise<void> {
    }

    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<SetTeamSettings>): Promise<void> {
        this.setButtonTitle(ev);
    }
}

interface EventPayload {
    payload: {
        settings: SetTeamSettings;
    };
    action: any;
}

type Data = {
    status: string;
    message: string;
};

type SetTeamSettings = {
    teamSide?: string;
    teamName?: string;
};