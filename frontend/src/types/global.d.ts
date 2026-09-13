export {};

declare global {
    interface Window {
        openPostModal?: () => void;
    }
}
