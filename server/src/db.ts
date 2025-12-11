import mongoose from 'mongoose';

export async function connectDB(uri: string){
  try{
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  }catch(err){
    console.error('MongoDB connection error', err);
    // don't exit the process in development — allow in-memory fallback
    return false;
  }
}

export default mongoose;
