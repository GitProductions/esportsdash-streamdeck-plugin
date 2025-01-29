import streamDeck, { LogLevel } from '@elgato/streamdeck';
import { AdjustScore } from './actions/adjust-score';
import { ResetMatch } from './actions/reset-match';
import { SwapTeams } from './actions/swap-teams';
import { WindowControls } from './actions/window-controls';
import { UpdateMatch } from './actions/update-match';
import { SelectTeam } from './actions/select-team';
import { SetTeamName } from './actions/set-team-name';
import socket from './websocket/socket';

// Set up logging for debugging - trace for everything
streamDeck.logger.setLevel(LogLevel.TRACE);

streamDeck.actions.registerAction(new AdjustScore());
streamDeck.actions.registerAction(new ResetMatch());
streamDeck.actions.registerAction(new SwapTeams());
streamDeck.actions.registerAction(new UpdateMatch());
streamDeck.actions.registerAction(new WindowControls());
streamDeck.actions.registerAction(new SetTeamName());



// Doesnt work as expecte right now as we need a way to update the team list in the property inspector
// from within the action??  this way we can simplify the entire workflow and have a socket.io event rather than polling
streamDeck.actions.registerAction(new SelectTeam());

// SelectGameConfig action will be simiiar to above where it fetches names of available game configs and then lets user choose



type Team = {
    id: number;
    name: string;
    logo: string;
};


// async function fetchAndModifyTeamList(): Promise<Team[]> {
//     try {
//         const response = await fetch('http://localhost:8080/api/teams/teamlist');
//         let fullTeamList = await response.json() as Team[];

//         // Add an ID to every team in the list for testing purposes
//         // fullTeamList.forEach(team => {
//         //     team.id = Math.floor(Math.random() * 1000);
//         // });

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

// fetchAndModifyTeamList();


socket.on('teamManager', (data) => {
    switch (data.type) {
        case 'onStartup':
            // socket.emit('teamList', {
            //     sender: 'streamDeck',
            //     timestamp: Date.now(),
            //     received: true,
            //     teams: ['Team 1', 'Team 2', 'Team 3', 'Team 4']
            // })
            
            streamDeck.logger.info('Received team manager startup:', data);
            break;
        case 'teamAdded':
            streamDeck.logger.info('Received team added:', data);
            break;
        case 'teamRemoved':
            streamDeck.logger.info('Received team removed:', data);
            break;
        
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
