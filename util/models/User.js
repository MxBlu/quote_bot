const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  _id: { // Composite index of
    user: String, // Discord user ID
    guild: String // Guild where user is residing
  },
  guild: String, // Guild to tie this 
  displayName: String, // Last known display name
  discriminator: String // Discord user discriminator
});
UserSchema.statics.getById = function (user, guild) { 
  return this.findById({ user, guild })
}
UserSchema.statics.upsert = function (user, guild, displayName, discriminator) { 
  return this.updateOne(
    { _id: { user, guild } },
    { $set: { displayName, discriminator } },
    { upsert: true }
  ).exec();
}

module.exports = mongoose.model('User', UserSchema);