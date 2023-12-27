const functions = require('@google-cloud/functions-framework');
const { google } = require("googleapis");
const TelegramBot = require('node-telegram-bot-api')

// Register a CloudEvent callback with the Functions Framework that will
// be executed when the Pub/Sub trigger topic receives a message.
functions.cloudEvent('chapter', async cloudEvent => {

      const auth = await google.auth.getClient({
          scopes: [
            "https://www.googleapis.com/auth/drive"
          ]
        });
      
      
      const drive = google.drive({version: 'v3', auth: auth});
      try {

        //Gets the id of the 'uploads' folder 
        const uploadsFolderName = 'Uploaded'

        const uploadsFolderResponse = await drive.files.list({
          q: `name='${uploadsFolderName}' and mimeType='application/vnd.google-apps.folder'`,
          fields: 'files(id)',
          includeItemsFromAllDrives: true, 
          supportsAllDrives: true
        });
      
        const uploadsFolderId = uploadsFolderResponse.data.files[0].id
        //Queries for files that starts with 'Chapter' and is not in the uploads folder
         const res = await drive.files.list({
          q:  `(name contains 'Chapter') and (not '${uploadsFolderId}'  in parents)`, 
          files: 'files(id,name)', 
          orderBy: 'name',
          includeItemsFromAllDrives: true, 
          supportsAllDrives: true
         });
       
         const files = res.data.files
         
         //Get chapters to upload today 
         const todaysChapters = getTodaysChapters() 
         console.log("Today's chapters: " + todaysChapters.join(" "))
        //chaptersNotUploaded contains the list of chapters that are supposed to be uploaded but have not been  
         const chaptersNotUploaded = []
         
         //Check if the chapters to upload today have been uploaded
         files.forEach((f)=>{
            const chapterName = getChapterNumber(f.name)
            //if file name matches a chapter in todaysChapters, it means that the file was not uploaded yet. Add the file to chaptersNotUploaded
            if (todaysChapters.includes(chapterName)){
              chaptersNotUploaded.push(f.name)
            }
         })
         const token = process.env.BOT_TOKEN
         const bot = new TelegramBot(token, {polling: true});
         console.log(chaptersNotUploaded)
         const chatId = process.env.CHAT_ID
         
      
         if (chaptersNotUploaded.length > 0){
           
           
              bot.sendMessage(chatId, `${chaptersNotUploaded.length} chapter${chaptersNotUploaded.length > 1? 's': ''} not uploaded today: \n ${chaptersNotUploaded.join('\n')} \n https://admin-v2.wuxiaworld.com/novels/i-have-a-sword/chapters`)
              return 
            
          } else{
          
            
              bot.sendMessage(chatId, `All chapters uploaded today`)
              return
            
         }
         
         //If yes, do nothing 
         //If not, send an message
        
        

        
        
      } catch (err){
        console.log(err)
      }
     
      


});




const getTodaysChapters = () => {
  //Returns list of chapter numbers to be published today. 
    const today = new Date() 
    const targetDate = new Date('2023-12-20')
    
    const lastPublishedChapter = 334 //334 was the last chapter to be published from 2023-20-12
    const timeDifference = today - targetDate
 
    const daysDifference = Math.floor(timeDifference/(1000*60*60*24))
   
    return [ lastPublishedChapter + daysDifference*2 -1 ,lastPublishedChapter + daysDifference*2]
  }

  const getChapterNumber = (fileName) => {
    //Accepts a file name and returns the integer representation of the chapter name 
    const regex = /Chapter (\d+)(?:\s.*)?(?:\.docx)?(?::|$)/;
    const match = fileName.match(regex);


    return match? parseInt(match[1]) : null;
  }
