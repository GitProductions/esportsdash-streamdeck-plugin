import streamDeck, { LogLevel } from '@elgato/streamdeck';
import { AdjustScore } from './actions/adjust-score';
import { ResetMatch } from './actions/reset-match';
import { SwapTeams } from './actions/swap-teams';
import { WindowControls } from './actions/window-controls';
import socket from './websocket/socket';  // Import the singleton socket instance

// Set up logging for debugging
streamDeck.logger.setLevel(LogLevel.TRACE);

// Register the increment action
streamDeck.actions.registerAction(new AdjustScore());
streamDeck.actions.registerAction(new ResetMatch());
streamDeck.actions.registerAction(new SwapTeams());
streamDeck.actions.registerAction(new WindowControls());


socket.on('scoreUpdate', (data) => {
    streamDeck.logger.info('Received score update:', data);
    console.log('Received score update:', data);

    // emit event to adjustScore action
    // AdjustScore.eventEmitter.emit(`scoreUpdated:${data.team}`, data.teamScore);
});
socket.on('updateMatchData', (data: MatchUpdate) => {
    streamDeck.logger.info('Received match data update:', data);
    
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

            // if (typeof teamData.teamColor !== 'undefined') {
            //     AdjustScore.eventEmitter.emit(`colorUpdated:${teamData.teamNumber}`, 
            //         teamData.teamColor
            //     );
            // }

            if (typeof teamData.teamName !== 'undefined') {
                AdjustScore.eventEmitter.emit(`nameUpdated:${teamData.teamNumber}`, 
                    teamData.teamName
                );
            }
        });
    }

    socket.emit('roundTrip', { 
        received: true,
        timestamp: Date.now() 
    });
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
