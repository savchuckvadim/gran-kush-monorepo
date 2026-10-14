/** Where the janitor reports: the platform Telegram chat. Never throws: a lost message must not stop a cleanup. */
export abstract class JanitorNotifier {
    abstract notify(text: string): Promise<void>;
}
