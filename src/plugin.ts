import streamDeck, { LogLevel } from '@elgato/streamdeck';
import { AdjustScore } from './actions/adjust-score';
import { ResetMatch } from './actions/reset-match';
import { SwapTeams } from './actions/swap-teams';
import { WindowControls } from './actions/window-controls';
import { UpdateMatch } from './actions/update-match';
import { SetTeamName } from './actions/set-team-name';

import { SelectTeam } from './actions/select-team';

import socket from './websocket/socket';

// Set up logging for debugging - trace for everything
streamDeck.logger.setLevel(LogLevel.TRACE);

streamDeck.actions.registerAction(new AdjustScore());
streamDeck.actions.registerAction(new ResetMatch());
streamDeck.actions.registerAction(new SwapTeams());
streamDeck.actions.registerAction(new UpdateMatch());
streamDeck.actions.registerAction(new WindowControls());
streamDeck.actions.registerAction(new SetTeamName());

// something in select team causes it not to work when compiled???
streamDeck.actions.registerAction(new SelectTeam());

// SelectGameConfig action will be simiiar to above where it fetches names of available game configs and then lets user choose



type Team = {
    id: number;
    name: string;
    logo: string;
};

//// - NOTE   ----------- ////
// this is likely needed or something similar IF we are connecing AFTER the app has been started..
// because the app would have already fired this 'onstartup' event... right?
// -----------


// async function fetchTeamList(): Promise<Team[]> {
//     try {
//         // this should be swapped to a socket event that gets sent on startup and then again if it changes
//         // for now we use this...
//         const response = await fetch('http://localhost:8080/api/teams/teamlist');
//         let fullTeamList = await response.json() as Team[];
//         console.log('Modified team list:', fullTeamList);
//         streamDeck.settings.setGlobalSettings({
//             teamList: fullTeamList
//         });

//         return fullTeamList;
//     } catch (error) {
//         console.error('Error fetching team list:', error);
//         return [];
//     }
// }
// fetchTeamList();



// not sure if we have any use for teamadded/teamremoved events..
// simply we should get an event anytime a new team is added/removed or startup and always override the previous teamList
socket.on('teamManager', (data) => {
    if (!data.type ) {
        return;
    }

    streamDeck.logger.info('Received team manager event:', data);
    switch (data.type) {
        case 'onStartup':
            streamDeck.settings.setGlobalSettings({
                teamList: data.teams
                // teamList: []
                // teamList:  [
                //     {
                //         id: 1,
                //         name: 'Cat 1',
                //         logo: 'https://placecats.com/200/200'
                //     },
                //     {
                //         id: 2,
                //         name: 'Cat 2',
                //         logo: 'https://placecats.com/200/200'
                //     },
                //     {
                //         id: 3,
                //         name: 'Cat 3',
                //         logo: 'https://placecats.com/200/200'
                //     },
                //     {
                //         id: 4,
                //         name: 'Cat 4',
                //         logo: 'https://placecats.com/200/200'
                //     }   
                // ]
            });   
            streamDeck.logger.info('Received team manager startup:', data);
            break;
        // case 'teamAdded':
        //     streamDeck.settings.setGlobalSettings({
        //         teamList: data.teams
        //     });   
        //     streamDeck.logger.info('Received team added:', data);
        //     break;
        // case 'teamRemoved':
        //     streamDeck.logger.info('Received team removed:', data);
        //     break;
        
        default:
            break;
    }
});


// When updated match data comes from the server, update the Stream Deck
socket.on('updateMatchData', (data: MatchUpdate) => {
    streamDeck.logger.info('Received match data update:', data);

    // emit globally for all actions to listen to

    // socket.emit('updateMatchDataReceived', {
    //     received: true,
    //     timestamp: Date.now(),
    //     sender: 'streamDeck'
    // });


    // aking full 'teamUpdate' and splitting into individual team updates.. 
    // we should be data.type = teamScore, teamName etc.. teamUpdate can be when doing the WHOLE team on select maybe?
    if (data.type === 'teamUpdate' && data.teams) {
        Object.entries(data.teams).forEach(([teamKey, teamData]: [string, TeamData]) => {
            AdjustScore.eventEmitter.emit('teamUpdate', {
                teamNumber: teamData.teamNumber,
                changes: teamData
            });

            if (typeof teamData.teamScore !== 'undefined') {
                AdjustScore.eventEmitter.emit(`scoreUpdated:${teamData.teamNumber}`,
                    teamData.teamScore
                );
            }

            if (typeof teamData.teamLogoUrl !== 'undefined') {
                AdjustScore.eventEmitter.emit(`logoUpdated:${teamData.teamNumber}`,
                    teamData.teamLogoUrl
                );
            }

            if (typeof teamData.teamName !== 'undefined') {
                AdjustScore.eventEmitter.emit(`nameUpdated:${teamData.teamNumber}`,
                    teamData.teamName
                );
            }
        });
    }





    socket.emit('roundTrip', {
        received: true,
        timestamp: Date.now(),
        sender: 'streamDeck'
    });


    // socket.on('scoreUpdate', (data) => {
    //     streamDeck.logger.info('Received score update:', data);
    //     console.log('Received score update:', data);

    // });
});



// Finally, connect to the Stream Deck
streamDeck.connect();


// types def for teamData

interface TeamData {
    teamName: string;
    teamInfo: string;
    teamLogo: string;
    teamLogoUrl: string;
    teamScore: number;
    teamColor: string;
    teamGroup: string;
    players: any[];
    teamNumber: string;
}

interface MatchUpdate {
    type: 'teamUpdate';
    teams: {
        [key: string]: TeamData;
    };
    timestamp: number;
}
