const DISCORD_MAX_LEN = 1900;

function chunkString(str) {
  let chunks = [];
  let strBuffer = '';

  // Split by newline and concat strings until ideal length
  // Then add so chunks list
  str.split("\n").forEach(s => {
    // A single oversized string, chunk by length
    if (s.length > DISCORD_MAX_LEN) {
      // Flush buffer as a chunk if there's any
      if (strBuffer.length > 0) {
        chunks.push(strBuffer);
        strBuffer = '';
      }
      for (let i = 0; i < s.length; i += DISCORD_MAX_LEN) {
        chunks.push(s.substr(i, DISCORD_MAX_LEN));
      }
    // Adding the current string would cause it to go oversized
    // Add the current buffer as a chunk, then set the buffer 
    //   to the current str
    } else if (strBuffer.length + s.length + 1 > DISCORD_MAX_LEN) {
      chunks.push(strBuffer);
      strBuffer = s + "\n";
    // Otherwise, add the string the the buffer
    } else {
      strBuffer += s + "\n";
    }
  });

  // Flush the buffer again
  if (strBuffer.length > 0) {
    chunks.push(strBuffer);
    strBuffer = '';
  }

  return chunks;
}

function sendCmdMessage(message, msg, level, logger) {
  logger.info(`${message.author.username} - ${message.guild.name} - ${msg}`, level);
  sendMessage(message.channel, msg);
}

function sendMessage(targetChannel, msg) {
  var msgChunks = chunkString(msg);
  msgChunks.forEach(
    (chunk) => targetChannel.send(chunk));
}

exports.sendCmdMessage = sendCmdMessage;
exports.sendMessage = sendMessage;