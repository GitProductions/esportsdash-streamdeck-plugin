import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent,
     DidReceiveSettingsEvent, DidReceiveGlobalSettingsEvent } from "@elgato/streamdeck";
import socket from '../websocket/socket';

let fullTeamList: Team[] = [];

let fakeTeamList = [
    {
        id: 1,
        name: 'Cat 1',
        logo: 'https://placecats.com/200/200'
    },
    {
        id: 2,
        name: 'Cat 2',
        logo: 'https://placecats.com/200/200'
    },
    {
        id: 3,
        name: 'Cat 3',
        logo: 'https://placecats.com/200/200'
    },
    {
        id: 4,
        name: 'Cat 4',
        logo: 'https://placecats.com/200/200'
    }   
];



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


    
    private async setButtonInfo(ev: EventPayload) {
        const { team, teamList } = ev.payload.settings;
        // find team in list based on name aka 'teamList' will be teamname here
        const matchedTeam = fullTeamList.find(t => t.name === teamList);
        if (!matchedTeam) {
            streamDeck.logger.error('Team not found:', teamList);
            return;
        }

        // setting the title & logo based on the team selected
        ev.action.setTitle(`SELECT\n${matchedTeam.name}`);
        const teamLogo = await this._fetchImageAsBase64(matchedTeam.logo);
        ev.action.setImage(teamLogo);

    }


    private async _fetchImageAsBase64(url: string): Promise<string> {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
    }


    private async fetchAndModifyTeamList(): Promise<Team[]> {
        try {
            const response = await fetch('http://localhost:8080/api/teams/teamlist');
            fullTeamList = await response.json() as Team[];

            // Add an ID to every team in the list for testing purposes
            // fullTeamList.forEach(team => {
            //     team.id = Math.floor(Math.random() * 1000);
            // });

            console.log('Modified team list:', fullTeamList);
            return fullTeamList;
        } catch (error) {
            console.error('Error fetching team list:', error);
            return [];
        }
    }

    override onWillAppear(ev: WillAppearEvent<SelectTeamSettings>): void | Promise<void> {
        this.updateButtonTitle(socket.connected);
        const currentSettings = ev.payload.settings;

        streamDeck.logger.info('ButtonAppears:', currentSettings);

        // const globalSettings = streamDeck.settings.getGlobalSettings()

        // if (globalSettings.teamList) {
        //     fullTeamList = globalSettings.teamList;
        // }

        this.fetchAndModifyTeamList().then(teamList => {
            const mergedSettings = {
                ...currentSettings,
                teamList
            };
            streamDeck.settings.setGlobalSettings(mergedSettings);
        });

        this.setButtonInfo(ev);
    }


    override async onKeyDown(ev: KeyDownEvent<SelectTeamSettings>): Promise<void> {
        if (!socket.connected) {
            ev.action.showAlert();
            return;
        }
        const { settings } = ev.payload;
        const response = await fetch(`http://localhost:8080/api/setTeamName?team=${settings.teamSide}&name=${settings.teamList}`);
        const data = await response.json() as Data;

        if (data.status === 'error') {
            ev.action.showAlert();
            return;
        }
        ev.action.showOk();


    }

    


    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<SelectTeamSettings>): Promise<void> {
        streamDeck.logger.info('Received settings from SelectTEAM:', ev.payload.settings);
        this.setButtonInfo(ev);
    }

    override async onWillDisappear(ev: WillDisappearEvent<SelectTeamSettings>): Promise<void> {
    }
}


type Team = {
    id: number;
    name: string;
    logo: string;
};


type SelectTeamSettings = {
    team?: string;
    teamLogo: string;
    teamList?: string;
    teamSide?: string;
    teamSelection?: string;
};


type Data = {
    status: string;
    message: string;
};


interface EventPayload {
    payload: {
        settings: SelectTeamSettings ;
    };
    action: any;
}