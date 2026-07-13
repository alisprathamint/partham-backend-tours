import prisma from '../../../config/prisma.js';

export const findBookingByOrderId = async (orderId) => {
  return await prisma.booking.findUnique({
    where: { order_id: orderId }
  });
};

export const createBooking = async (data) => {
  return await prisma.booking.create({
    data
  });
};
