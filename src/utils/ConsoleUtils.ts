import Colors = require('colors.ts');
Colors.enable();

export class ConsoleUtils {

    public printError(error: any) {
        // O código '\x1b[31m%s\x1b[0m' representa a cor vermelha no console.
        // Não é possível usar adequadamente o Colors para imprimir exceções com cores personalizadas.
        console.log('\x1b[31m%s\x1b[0m', error);
    }

    public printWarning(message: string) {
        console.log(Colors.colors('yellow', message));
    }

    public printSuccess(message: string) {
        console.log(Colors.colors('green', message));
    }

}