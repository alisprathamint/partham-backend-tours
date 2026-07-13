import prisma from '../../../config/prisma.js';

export const createBookingRequest = async (data) => {
  return await prisma.bookingRequest.create({ data });
};

export const createTraveler = async (data) => {
  return await prisma.traveler.create({ data });
};

export const createManyTravelers = async (data) => {
  return await prisma.traveler.createMany({ data });
};
