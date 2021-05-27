var http = require('ava-http');
var h = require('../helpers')

function getCheckTribe(t, node, tribeId){
    return new Promise((resolve, reject) => {
      let i = 0
      const interval = setInterval(async() => {
        i++
        let res = await http.get(node.ip+'/contacts', h.makeArgs(node));
        if(res){
            let r = res.response.chats.find(chat => chat.id === tribeId)
            if(r){
                clearInterval(interval)
                resolve(r)
            }         
        }
        if(i>10){
          clearInterval(interval)
          reject(["failed to getCheckTribe"])
        } 
      }, 1000)
    })
  }

  module.exports = getCheckTribe