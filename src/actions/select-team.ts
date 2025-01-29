import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import socket from '../websocket/socket';


@action({ UUID: "com.esportsdash.esportsdash-controller.selectteam" })
export class SelectTeam extends SingletonAction<SelectTeamSettings> {
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
            action.setTitle(isConnected ? `SELECT\nTEAM` : ``);
			action.setImage(isConnected ? '' : 'imgs/actions/disconnected.png');  
        });

    }


    

    override onWillAppear(ev: WillAppearEvent<SelectTeamSettings>): void | Promise<void> {
        this.updateButtonTitle(socket.connected);

        ev.action.setSettings({
            team: ev.payload.settings.team,
            teamList: ['Team 1', 'Team 2', 'Team 3', 'Team 4']
        });


        // send to property inspector


        // this.send
        


        streamDeck.logger.info('SelectTeam action will appear:', ev);
    }



    override async onKeyDown(ev: KeyDownEvent<SelectTeamSettings>): Promise<void> {
        if (!socket.connected) {
            ev.action.showAlert();
            return;
        }
    }

    override async onWillDisappear(ev: WillDisappearEvent<SelectTeamSettings>): Promise<void> {

    }
}




type SelectTeamSettings = {
    team?: string;
    teamList?: string[];
};