import { createLogger, format, transports } from 'winston';


const logFormat = format.printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
})

export function withLogger(label: string) {
    return createLogger({
        format: format.combine(
            format.label({ label }),
            format.timestamp(),
            format.colorize(),
            logFormat            
        ),
        level: process.env.LOG_LEVEL || 'debug',
        transports: [
            new transports.Console(),
            new transports.File({
                filename: 'log.txt'
            })
        ]
    });
}