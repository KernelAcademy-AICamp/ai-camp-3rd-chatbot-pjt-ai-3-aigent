declare module "arima" {
    interface ARIMAOptions {
        p?: number;
        d?: number;
        q?: number;
        P?: number;
        D?: number;
        Q?: number;
        s?: number;
        auto?: boolean;
        verbose?: boolean;
        method?: number;
        optimizer?: number;
        transpose?: boolean;
    }

    class ARIMA {
        constructor(options?: ARIMAOptions);
        train(data: number[]): void;
        predict(steps: number): [number[], number[]];
    }

    export default ARIMA;
}
