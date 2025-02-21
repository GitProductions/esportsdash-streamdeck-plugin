const SOCKET_CONSTANTS = {
    ROOMS: {
        MATCH: 'matchData',
        BRACKET: 'bracketData',
        SCORES: 'scoreUpdates'
    },
    EVENTS: {
        CLIENT: {
            SYSTEM: {
                JOIN_ROOM: 'client:system:join',
                LEAVE_ROOM: 'client:system:leave',
                DISCONNECT: 'client:system:disconnect',
                PING: 'client:system:ping'
            },
            MATCH: {
                UPDATE: 'client:match:update',
                FULL_UPDATE: 'client:match:fullUpdate'
            },
            TEAMS: {
                UPDATE: 'client:teams:update',
                REQUEST_LIST: 'client:teams:requestList'
            }
        },
        SERVER: {
            SYSTEM: {
                CLIENT_CONNECTED: 'server:system:connected',
                CLIENT_DISCONNECTED: 'server:system:disconnected',
                SD_STATUS: 'server:system:sdStatus',
                PONG: 'server:system:pong'
            },
            MATCH: {
                UPDATED: 'server:match:updated',
                FULL_DATA: 'server:match:fullData'
            },
            TEAMS: {
                LIST_UPDATED: 'server:teams:listUpdated',
                SINGLE_UPDATED: 'server:teams:singleUpdated'
            }
        }
    }
};

module.exports = SOCKET_CONSTANTS;
