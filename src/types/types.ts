export type SelectTeamSettings = {
    teamSide?: string;
    teamList?: string; 
    teamLogo?: string;
    teamName?: string; 
    teamId?: string;
    showTeamName?: boolean;
};

export type Team = {
    id: string; 
    name: string;
    logo: string;
    color?: string;
    players?: any[];
    gameRosters?: any[];
    createdAt?: number;
    updatedAt?: number;
};

export type Data = {
    status: string;
    message: string;
};

export interface EventPayload {
    payload: {
        settings: SelectTeamSettings;
    };
    action: any;
}
