const fs = require('fs')
const path = require('path');
var bot = require('../bot.js')
var main = require('../main.js')

var svgConvertor = require('./svg_to_coords/svg_convertor')
const Command = require('../models/Command.js').Command
let imgPath = '../files/drawings'

let description = 'dessiner sur le tableau (faire !dessine pour voir les dessins disponibles)'
let drawer = null

var DrawCmd = new Command('dessine', call, description, false)
module.exports.DrawCmd = DrawCmd

var imgs = []

module.exports.imgs = imgs

/**
 * The function scan the /files/drawings/svg folder to detect any new files.
 * SVG files are then automatically converted to an array of absolute coordinates and put in a .json file in /files/drawings/path
 */
function registerImgs() {
    let jsonFiles = fs.readdirSync(path.resolve(__dirname, `${imgPath}/path`)).filter(file => { 
        if(file.includes('.json')) {
            return file
        }
    }).map(fileName => fileName.split('.json')[0])

    let svgFiles = fs.readdirSync(path.resolve(__dirname, `${imgPath}/svg`)).filter(file => { 
        if(file.includes('.svg')) {
            return file
        }
    }).map(fileName => fileName.split('.svg')[0])

    svgFiles.forEach(file => {
        if (jsonFiles.indexOf(file) == -1) {
            console.log('new file detected in the drawings folder :', file)
            svgConvertor.convert(file)
        }

        imgs.push({
            name: file, 
            path: `${imgPath}/path/${file}.json`
        })
    })
}

registerImgs()

async function call(content) {
    
    let currentBot = bot.getBotInstance()

    let desiredImg = imgs.find(img => img.name == content.message)

    if (!desiredImg) {
        await currentBot.webdriver.sendChat('Voici les dessins disponibles')

        for (let img of imgs) {
            await currentBot.webdriver.sendChat('> ' + currentBot.tag + DrawCmd.name + ' ' + img.name)
        }

        return false
    } else {

        if (drawer == null) {
            var imagePoints = JSON.parse(fs.readFileSync(path.resolve(__dirname, desiredImg.path)))
            drawer = new Drawer()

            try {
                await drawer.draw(imagePoints, currentBot)
                drawer = null
                return true
            } catch (e) {

                // If there is a username, it means the message comes from the chat and not from the dashboard
                if(content.username) {
                    await currentBot.webdriver.sendChat('Je ne peux pas dessiner sur la page actuelle !')
                }

                drawer = null
                return false
            }

        } else {
            // If there is a username, it means the message comes from the chat and not from the dashboard
            if(content.username) {
                await currentBot.webdriver.sendChat('Attends un peu que je finisse mon dessin !')
            }
        }
    }

}

class Drawer {

    // TODO : Check if the drawing is available
    async draw(points, currentBot) {
        var page = currentBot.webdriver.page

        // If an error is caught, it means the pencil icon is not present and consequently, drawing is not possible
        var drawingCanvas = await page.waitForSelector('#whiteboard_container > div > div.canvas_container.paper', {timeout: 1000})
    
        let boundingBox = await drawingCanvas.boundingBox()
        var width = boundingBox.width
        var height = boundingBox.height
        var xPos = boundingBox.x + 10
        var yPos = boundingBox.y + 10
    
        var maxPoint = [0, 0]
    
        points.forEach(point => {
            if (point[0] > maxPoint[0]) {
                maxPoint[0] = point[0]
            }
    
            if (point[1] > maxPoint[1]) {
                maxPoint[1] = point[1]
            }
        })
    
        maxPoint[0] == 0 ? maxPoint[0] = width: null
        maxPoint[1] == 0 ? maxPoint[1] = height: null
    
        let ratioX = width / maxPoint[0]
        let ratioY = height / maxPoint[1]
        var ratio = Math.min(ratioY, ratioX)
    
        points.forEach(point => {
            point[0] = Math.round(point[0] * ratio * 0.9) + xPos
            point[1] = Math.round(point[1] * ratio * 0.9) + yPos
        })
    
        /**console.log('pos', xPos, yPos)
        console.log('max X', width + xPos)
        console.log('max Y', height + yPos)
        console.log('limits', width, height)
        console.log('points', points)**/
    
        const mouse = page.mouse
        await page.click('#select-pencil')
        await mouse.move(points[0][0], points[0][1])
        await mouse.down()
        
    
        for (let i = 0; i<points.length; i++) {
    
            let dist = 0
    
            if (i > 0) {
                dist = Math.sqrt(
                    Math.pow(points[i][0] - points[i - 1][0], 2) 
                    + Math.pow(points[i][1] - points[i - 1][1], 2))
            }
    
            if (dist > 15) {
                await mouse.up()
            } else {
                await mouse.down()
            }
    
            await mouse.move(points[i][0], points[i][1], {step: 150})
    
        }
    
        await mouse.up()
    
    }
    
}
