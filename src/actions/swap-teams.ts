import { action, KeyDownEvent, SingletonAction, WillAppearEvent} from "@elgato/streamdeck";

@action({ UUID: "com.esportsdash.esportsdash-controller.swapteams" })
export class SwapTeams extends SingletonAction {
	override onWillAppear(ev: WillAppearEvent): void | Promise<void> {
		return ev.action.setTitle(`SWAP\nTEAMS`);
	}

	override async onKeyDown(ev: KeyDownEvent): Promise<void> {
        fetch('http://localhost:8080/api/swapTeams')
	}
}
