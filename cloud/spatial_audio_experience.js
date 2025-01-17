const AUDIO_ROOM_MODEL = "AudioRoom";
const AUDIO_PERSON = "AudioPerson";
const USERS_AUDIO = "UsersAudio";
const ROOMS_AUDIO = "RoomsAudio";

const createAudioPersonObject = async (
  dolbyId,
  userId,
  muralId,
  widgetId,
  coordinates,
  muted,
  facilitator,
  roomId,
  anchor,
  videoPlaying
) => {
  const AudioPerson = await Parse.Object.extend(AUDIO_PERSON);
  const newPerson = new AudioPerson();

  newPerson.set("dolbyId", dolbyId);
  newPerson.set("userId", userId);
  newPerson.set("muralId", muralId);
  newPerson.set("widgetId", widgetId);
  newPerson.set("coordinates", coordinates);
  newPerson.set("muted", muted);
  newPerson.set("facilitator", facilitator);
  newPerson.set("roomId", roomId);
  newPerson.set("anchor", anchor);
  newPerson.set("videoPlaying", videoPlaying);

  return newPerson;
};

const registerAudioPerson = async (
  dolbyId,
  userId,
  muralId,
  widgetId,
  coordinates,
  muted,
  facilitator,
  roomId,
  anchor,
  videoPlaying
) => {
  try {
    const newPerson = await createAudioPersonObject(
      dolbyId,
      userId,
      muralId,
      widgetId,
      coordinates,
      muted,
      facilitator,
      roomId,
      anchor,
      videoPlaying
    );
    await newPerson.save();

    return await newPerson;
  } catch (e) {
    console.log("error in registerAudioPerson ", e);
  }
};

Parse.Cloud.define("registerAudioPerson", async ({ params }) => {
  const {
    dolbyId,
    userId,
    muralId,
    widgetId,
    coordinates,
    muted,
    facilitator,
    roomId,
    anchor
  } = params;
  const personExists = await new Parse.Query(AUDIO_PERSON)
    .equalTo("userId", userId)
    .find();

  const sameUser = personExists.length
    ? personExists.find(user => user.get("muralId") === muralId)
    : null;

  if (sameUser) {
    sameUser.destroy();
  }
  const audioPerson = await registerAudioPerson(
    dolbyId,
    userId,
    muralId,
    widgetId,
    coordinates,
    muted,
    facilitator,
    roomId,
    anchor
  );

  return { audioPerson: audioPerson.toJSON() };
});

Parse.Cloud.define("registerAudioRoom", async ({ params }) => {
  const { widgetId, muralId, width, height, x, y, startStage, name, innerScale } = params;

  const allRooms = await new Parse.Query(AUDIO_ROOM_MODEL)
      .equalTo("muralId", muralId)
      .find();

  if (allRooms && allRooms.length && startStage) {
    allRooms.find(
        room =>
            room.get("startStage") === true &&
            room.set("startStage", false) &&
            room.save()
    );
  }
  const AudioRoomExists = allRooms.find(i => i.get("widgetId") === widgetId);
  if (AudioRoomExists) {
    await AudioRoomExists.destroy();
  }

  const AudioRoom = await Parse.Object.extend(AUDIO_ROOM_MODEL);

  const newRoom = new AudioRoom();
  newRoom.set("widgetId", widgetId);
  newRoom.set("muralId", muralId);
  newRoom.set("width", width);
  newRoom.set("height", height);
  newRoom.set("x", x);
  newRoom.set("y", y);
  newRoom.set("startStage", startStage);
  newRoom.set("name", name);
  newRoom.set("innerScale", innerScale);

  return await newRoom.save();
});

Parse.Cloud.define("filterOutAudioRooms", async ({ params }) => {
  const { widgetIds, muralId } = params;
  let rooms = [];
  const allRooms = await new Parse.Query(AUDIO_ROOM_MODEL)
    .equalTo("muralId", muralId)
    .find();
  if (allRooms.length) {
    allRooms.forEach(
      room =>
        widgetIds.includes(room.get("widgetId")) && rooms.push(room.toJSON())
    );
  }
  return rooms;
});

Parse.Cloud.define("filterOutAudioRoomsId", async ({ params }) => {
  const { muralId } = params;
  let rooms = {};

  const allRooms = await new Parse.Query(AUDIO_ROOM_MODEL)
    .equalTo("muralId", muralId)
    .find();

  if (allRooms.length) {
    const allRoomsIds = allRooms.map(i => i.get("widgetId"));
    rooms.allRoomsId = allRoomsIds;

    const startStage = allRooms.find(room => room.get("startStage") === true);
    rooms.startRoomId = startStage ? startStage.get("widgetId") : "";
  }

  return rooms;
});

Parse.Cloud.define("removeAudioRoom", async ({ params }) => {
  const { widgetId, muralId } = params;

  const roomQuery = await new Parse.Query(AUDIO_ROOM_MODEL)
    .equalTo("muralId", muralId)
    .find();

  if (roomQuery.length) {
    roomQuery.forEach(
      room => widgetId === room.get("widgetId") && room.destroy()
    );
  }
});

Parse.Cloud.define("getAudioPersonas", async ({ params }) => {
  const personas = await new Parse.Query(AUDIO_PERSON)
    .equalTo("muralId", params.muralId)
    .find();

  return personas;
});

Parse.Cloud.define("getAudioPerson", async ({ params }) => {
  const person = await new Parse.Query(AUDIO_PERSON)
    .equalTo("userId", params.userId)
    .find();

  return person;
});

const filterAudioRoomsFields = person => ({
  widgetId: person.get("widgetId"),
  muralId: person.get("muralId"),
  active: person.get("active")
});

Parse.Cloud.define("removeAudioPersonas", async ({ params }) => {
  const { userIds, muralId } = params;
  const promiseArray = [];
  for (id of userIds) {
    promiseArray.push(
      new Parse.Query(AUDIO_PERSON).equalTo("userId", id).find()
    );
  }
  const personasQuery = await Promise.all(promiseArray);

  if (personasQuery.length) {
    for (userArray of personasQuery) {
      for (user of userArray) {
        if (muralId === user.get("muralId")) {
          user.destroy();
        }
      }
    }
  }
});

//Users audio
const createUsersAudioObject = async (userId, linkToAudio, name) => {
  const UsersAudio = await Parse.Object.extend(USERS_AUDIO);
  const newUsersAudio = new UsersAudio();

  newUsersAudio.set("userId", userId);
  newUsersAudio.set("linkToAudio", linkToAudio);
  newUsersAudio.set("name", name);

  return newUsersAudio;
};

const registerUsersAudio = async (userId, linkToAudio, name) => {
  try {
    const newAudio = await createUsersAudioObject(userId, linkToAudio, name);
    await newAudio.save();
    return newAudio;
  } catch (e) {
    console.log("error in registerUsersAudio ", e);
  }
};

Parse.Cloud.define("registerUsersAudio", async ({ params }) => {
  const { userId, linkToAudio, name } = params;

  const UsersAudio = await registerUsersAudio(userId, linkToAudio, name);
  return UsersAudio;
});

Parse.Cloud.define("getUsersAudio", async ({ params }) => {
  const personas = await new Parse.Query(USERS_AUDIO)
    .equalTo("userId", params.userId)
    .find();

  return personas;
});

//Rooms audio
const createRoomsAudioObject = async (
  audioId,
  userId,
  muralId,
  linkToAudio,
  roomId,
  autoplay,
  name,
  loop,
  volume
) => {
  const RoomsAudio = await Parse.Object.extend(ROOMS_AUDIO);
  const newRoomsAudio = new RoomsAudio();

  newRoomsAudio.set("audioId", audioId);
  newRoomsAudio.set("userId", userId);
  newRoomsAudio.set("muralId", muralId);
  newRoomsAudio.set("linkToAudio", linkToAudio);
  newRoomsAudio.set("roomId", roomId);
  newRoomsAudio.set("autoplay", autoplay);
  newRoomsAudio.set("name", name);
  newRoomsAudio.set("loop", loop);
  newRoomsAudio.set("volume", volume);

  return newRoomsAudio;
};

const registerRoomsAudio = async (
  audioId,
  userId,
  muralId,
  linkToAudio,
  roomId,
  autoplay,
  name,
  loop,
  volume
) => {
  try {
    const newAudio = await createRoomsAudioObject(
      audioId,
      userId,
      muralId,
      linkToAudio,
      roomId,
      autoplay,
      name,
      loop,
      volume
    );
    await newAudio.save();

    return newAudio;
  } catch (e) {
    console.log("error in registerRoomsAudio ", e);
  }
};

Parse.Cloud.define("registerRoomsAudio", async ({ params }) => {
  const {
    audioId,
    userId,
    muralId,
    linkToAudio,
    roomId,
    autoplay,
    name,
    loop,
    volume
  } = params;

  const RoomsAudioExists = await new Parse.Query(ROOMS_AUDIO)
    .equalTo("roomId", roomId)
    .first();

  if (RoomsAudioExists) {
    await RoomsAudioExists.destroy();
  }

  const RoomsAudio = await registerRoomsAudio(
    audioId,
    userId,
    muralId,
    linkToAudio,
    roomId,
    autoplay,
    name,
    loop,
    volume
  );
  return RoomsAudio;
});

Parse.Cloud.define("getRoomsAudio", async ({ params }) => {
  const roomAudio = await new Parse.Query(ROOMS_AUDIO)
    .equalTo("roomId", params.roomId)
    .find();

  return roomAudio;
});

Parse.Cloud.define("removeUserAudio", async ({ params }) => {
  const rooms = await new Parse.Query(ROOMS_AUDIO)
    .equalTo("audioId", params.objectId)
    .find();
  if (rooms.length) {
    rooms.forEach(room => room.destroy());
  }
  const audio = await new Parse.Query(USERS_AUDIO)
    .equalTo("objectId", params.objectId)
    .first();
  audio.destroy();

  const fileName = params.linkToAudio.split("/").pop();
  await new Parse.File(fileName).destroy();
  return params;
});

Parse.Cloud.define("removeRoomAudio", async ({ params }) => {
  const rooms = await new Parse.Query(ROOMS_AUDIO)
    .equalTo("objectId", params.objectId)
    .find();
  if (rooms.length) {
    rooms.forEach(room => room.destroy());
  }
  return params;
});

Parse.Cloud.define("getRoomStatistics", async ({ params }) => {
  const { roomId, muralId } = params;
  roomsStat = {
    active: 0,
    empty: 0
  };

  const getRooms = new Parse.Query(AUDIO_ROOM_MODEL)
    .equalTo("muralId", muralId)
    .find();

  const getUsers = new Parse.Query(AUDIO_PERSON)
    .equalTo("muralId", muralId)
    .find();

  const [rooms, users] = await Promise.all([getRooms, getUsers]);

  const usersInRoom = users.filter(i => i.get("roomId") === roomId && i.get("userId"));
  for (const room of rooms) {
    const inRoom = users.filter(i => i.get("roomId") === room.get("widgetId"));
    if (inRoom.length) {
      roomsStat.active++;
    } else {
      roomsStat.empty++;
    }
  }
  return {
    usersInRoomId: usersInRoom.map(i => i.get("userId")),
    activeRooms: roomsStat.active,
    emptyRooms: roomsStat.empty,
    activeUsersId: users.map(i => i.get("userId"))
  };
});

Parse.Cloud.define("getRooms", async ({ params }) => {
  const { muralId } = params;

  const getRooms = new Parse.Query(AUDIO_ROOM_MODEL)
    .equalTo("muralId", muralId)
    .find();
  return (await getRooms).length ? getRooms : [];
});
Parse.Cloud.define('uploadFile', async (req) => {
    const {file, name} = req.params;
    try {
        console.log('file >>>>>>', file);
        const newFile = await (await new Parse.File(name, { base64: file }).save()).toJSON();
        console.log('newFile >>>>>>', newFile);
        
        return newFile;
    } catch(err) {
        return err;
    }
})

const get = async (table, queryParams) => {
  const endpoint = "/classes/" + table;

  try {
    const response = await Parse.Cloud.httpRequest({
      url: 'https://139.ignite.getforge.com/parse' + endpoint + "?where=" + queryParams,
      method: "GET",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        "X-Parse-Application-Id": '57d572ba7bf85d35cb430f66eeb97ac4',
        "X-Parse-Master-Key": '6db194f4caa5cc95085e2c537811347d'
      }
    });

    if (response.status == 200) return response.data.results;
  } catch (e) {}

  return null;
};

Parse.Cloud.define("get", async ({ params }) => {
  const { table, queryParams } = params;
  console.log('get request >>>', params);
  const res = await get(table, queryParams);
  return res;
});

const remove = async (table, objectId) => {
  const endpoint = "/classes/" + table + "/" + objectId;

  try {
    const response = await Parse.Cloud.httpRequest({
      url: 'https://139.ignite.getforge.com/parse' + endpoint,
      method: "DELETE",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        "X-Parse-Application-Id": '57d572ba7bf85d35cb430f66eeb97ac4',
        "X-Parse-Master-Key": '6db194f4caa5cc95085e2c537811347d'
      }
    });

    if (response.status == 200) return response.data;
  } catch (e) {}

  return null;
};

Parse.Cloud.define("remove", async ({ params }) => {
  const { table, objectId } = params;
  const res = await remove(table, objectId);
  return res;
});

const post = async (table, body) => {
  const endpoint = "/classes/" + table ;

  try {
    const response = await Parse.Cloud.httpRequest({
      url: 'https://139.ignite.getforge.com/parse' + endpoint,
      method: "POST",
      body: body,
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        "X-Parse-Application-Id": '57d572ba7bf85d35cb430f66eeb97ac4',
        "X-Parse-Master-Key": '6db194f4caa5cc95085e2c537811347d'
      }
    });

    if (response.status == 201) return response.data;
  } catch (e) {}

  return null;
};

Parse.Cloud.define("post", async ({ params }) => {
  const { table, body } = params;
  const res = await post(table, body);
  return res;
});

const update = async (table, objectId, body) => {
  const endpoint = "/classes/" + table + "/" + objectId;
	console.log('room update >>>>', body);
  try {
    const response = await Parse.Cloud.httpRequest({
      url: 'https://139.ignite.getforge.com/parse' + endpoint,
      method: "PUT",
      body: body,
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        "X-Parse-Application-Id": '57d572ba7bf85d35cb430f66eeb97ac4',
        "X-Parse-Master-Key": '6db194f4caa5cc95085e2c537811347d'
      }
    });

    if (response.status == 200) return response.data;
  } catch (e) {}

  return null;
};

Parse.Cloud.define("update", async ({ params }) => {
  const { table, objectId, body } = params;
  const res = await update(table, objectId, body);
  return res;
});