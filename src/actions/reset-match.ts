import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

@action({ UUID: "com.esportsdash.esportsdash-controller.resetmatch" })
export class ResetMatch extends SingletonAction {
    private confirmationNeeded = false;
    private confirmationTimer: NodeJS.Timeout | null = null;

    override onWillAppear(ev: WillAppearEvent): void | Promise<void> {
        return ev.action.setTitle(`RESET\nMATCH`);
    }

    override async onKeyDown(ev: KeyDownEvent): Promise<void> {
        if (!this.confirmationNeeded) {
            // First click - show confirmation
            this.confirmationNeeded = true;
            await ev.action.setTitle('CONFIRM\nRESET');
            
            // Reset confirmation state after 3 seconds
            this.confirmationTimer = setTimeout(async () => {
                this.confirmationNeeded = false;
                await ev.action.setTitle('RESET\nMATCH');
                this.confirmationTimer = null;
            }, 2000);
        } else {
            // Second click - execute reset
            if (this.confirmationTimer) {
                clearTimeout(this.confirmationTimer);
                this.confirmationTimer = null;
            }
            
            await fetch('http://localhost:8080/api/resetTeams');
            this.confirmationNeeded = false;
            await ev.action.setTitle('RESET\nMATCH');
        }
    }

    override onWillDisappear(): void {
        if (this.confirmationTimer) {
            clearTimeout(this.confirmationTimer);
            this.confirmationTimer = null;
        }
    }
}
