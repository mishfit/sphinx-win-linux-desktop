var http = require('ava-http');
var h = require('../helpers')

function getCheckNewStream(t, node, string){

    return new Promise((resolve, reject) => {
      let i = 0
      const interval = setInterval(async() => {
        i++
        const msgRes = await http.get(node.ip+'/messages', h.makeArgs(node))
        if(msgRes.response.new_messages && msgRes.response.new_messages.length) {
          const streamMsg = msgRes.response.new_messages.find(msg => (msg.type === 28) && msg.message_content.includes(string))
          if(streamMsg) {
            clearInterval(interval)
            resolve(streamMsg)
          }
        }
        if(i>10){
          clearInterval(interval)
          reject(["failed to getCheckNewStream"])
        } 
      }, 1000)
    })
  }

  module.exports = getCheckNewStream