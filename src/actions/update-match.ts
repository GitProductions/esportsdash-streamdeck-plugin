import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

@action({ UUID: "com.esportsdash.esportsdash-controller.updatematch" })
export class UpdateMatch extends SingletonAction<CounterSettings> {
    private confirmationNeeded = false;
    private confirmationTimer: NodeJS.Timeout | null = null;

    override onWillAppear(ev: WillAppearEvent): void | Promise<void> {
        return ev.action.setTitle(`UPDATE\nMATCH`);
    }

    override async onKeyDown(ev: KeyDownEvent<CounterSettings>): Promise<void> {
        if (!this.confirmationNeeded) {
            // First click - show confirmation
            this.confirmationNeeded = true;
            await ev.action.setTitle('CONFIRM\nUPDATE');
            
            // Reset confirmation state after 3 seconds
            this.confirmationTimer = setTimeout(async () => {
                this.confirmationNeeded = false;
                await ev.action.setTitle('UPDATE\nMATCH');
                this.confirmationTimer = null;
            }, 3000);
        } else {
            // Second click - execute update
            if (this.confirmationTimer) {
                clearTimeout(this.confirmationTimer);
                this.confirmationTimer = null;
            }
            
            await fetch('http://localhost:8080/api/updateMatchData');
            this.confirmationNeeded = false;
            await ev.action.setTitle('UPDATE\nMATCH');
        }
    }

    override onWillDisappear(): void {
        if (this.confirmationTimer) {
            clearTimeout(this.confirmationTimer);
            this.confirmationTimer = null;
        }
    }
}

type CounterSettings = {
    count: number;
};