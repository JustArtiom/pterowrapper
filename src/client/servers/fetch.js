const axios = require('axios');

module.exports = async (config, lastcheck, uuid) => {
    if(!lastcheck) throw 'Wrapdactyl - Wrapdactyl is not ready'
    if(!lastcheck.panel) throw 'Wrapdactyl - Panel offline'
    if(!lastcheck.client) throw 'Wrapdactyl - client api key not configured or wrong'

    if(!uuid) throw 'Wrapdactyl - The uuid of the server must be provided'
    if(uuid.split('-').length > 1) uuid = uuid.split('-')[0]

    let data = await axios.get(config.url() + '/api/client/servers/'+uuid, {
        timeout: 5000,
        headers: {
            "Authorization": "Bearer "+ config.client(),
            "Content-Type": "application/json"
        }
    }).catch((err) => {
        if(err?.response?.status < 500) return {
            error: true,
            panelError: true,
            status: err.response.status,
            message: err.response.data.errors
        }

        return {
            error: true,
            panelError: false,
            message: err
        }
    })
    if(data.error) return data

    return data.data
}