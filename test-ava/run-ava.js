//AVA TEST COMMAND CENTER

//enter index of nodes to test, and whether to iterate or not
const run = {
    oneNode: [5],
    twoNodes: [5, 6],
    threeNodes: [5, 6, 7],
    active: "threeNodes",
    iterate: false,
    memeHost: "localhost:5000",
    allowedFee: 4,
}

module.exports = run