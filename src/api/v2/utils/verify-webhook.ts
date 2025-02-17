import { NextFunction, Request, Response } from 'express';
const verifyWebhook = (req: Request, res: Response) => {
    let VERIFY_TOKEN = 'pusher-bot';

    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
};

export default verifyWebhook;
