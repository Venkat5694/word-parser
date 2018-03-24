import request from 'request';
export function parseURL(url) {
    request.get(url, (error, response, body) => {
        console.log(body);
    })
}