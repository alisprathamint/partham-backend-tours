import * as destinationService from '../services/destination.service.js';

export const getDestinations = async (req, res) => {
  try {
    const destinations = await destinationService.findManyDestinations();
    const packages = await destinationService.findManyPackages({
      select: { location: true, name: true }
    });

    const getPackageCountForDestination = (destination) => {
      if (!destination.name) return 0;
      const destinationName = destination.name.toLowerCase();

      const commonWords = [
        "india", "the", "and", "&", "of", "in", "at", "to", "for", "with", "by", "a", "an",
        "escape", "retreat", "tour", "adventure", "getaway", "vacation", "holiday", "trip",
        "experience", "expedition", "journey", "splendor", "bliss", "explorer", "package", "packages"
      ];

      const locationWords = destinationName
        .split(/[\s,&-]+/)
        .filter((word) => word.length > 2 && !commonWords.includes(word));

      const matchingPackages = packages.filter((pkg) => {
        if (!pkg.location) return false;
        const packageLocation = pkg.location.toLowerCase();
        const packageName = pkg.name.toLowerCase();
        return locationWords.some((word) => packageLocation.includes(word) || packageName.includes(word));
      });

      return matchingPackages.length;
    };

    const destinationsWithCounts = destinations.map((dest) => {
      return {
        ...dest,
        count: getPackageCountForDestination(dest),
      };
    });

    res.json({
      success: true,
      data: {
        destinations: destinationsWithCounts,
      },
    });
  } catch (error) {
    console.error("Error fetching destinations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch destinations",
      error: error.message,
    });
  }
};

export const getDestinationById = async (req, res) => {
  try {
    const { id } = req.params;
    const destination = await destinationService.findDestinationById(Number.parseInt(id));

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: "Destination not found",
      });
    }

    res.json({
      success: true,
      data: {
        destination: destination,
      },
    });
  } catch (error) {
    console.error("Error fetching destination:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch destination",
      error: error.message,
    });
  }
};

export const getDestinationsByMonth = async (req, res) => {
  try {
    const { month } = req.params;
    const monthNum = Number.parseInt(month);

    if (isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
      return res.status(400).json({
        success: false,
        message: "Invalid month. Please provide a number between 0 and 11",
      });
    }

    const destinations = await destinationService.findDestinationsByMonth(monthNum);

    res.json({
      success: true,
      data: {
        destinations: destinations,
        month: monthNum,
      },
    });
  } catch (error) {
    console.error("Error fetching destinations for month:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch destinations for month",
      error: error.message,
    });
  }
};

export const createDestination = async (req, res) => {
  try {
    const newDestination = await destinationService.createDestination(req.body);
    res.status(201).json({ success: true, data: { destination: newDestination } });
  } catch (error) {
    console.error("Error creating destination:", error);
    res.status(500).json({ success: false, message: "Failed to create destination", error: error.message });
  }
};

export const updateDestination = async (req, res) => {
  try {
    const updatedDestination = await destinationService.updateDestinationById(Number.parseInt(req.params.id), req.body);
    if (!updatedDestination) {
      return res.status(404).json({ success: false, message: "Destination not found" });
    }
    res.json({ success: true, data: { destination: updatedDestination } });
  } catch (error) {
    console.error("Error updating destination:", error);
    res.status(500).json({ success: false, message: "Failed to update destination", error: error.message });
  }
};

export const deleteDestination = async (req, res) => {
  try {
    const deletedDestination = await destinationService.deleteDestinationById(Number.parseInt(req.params.id));
    if (!deletedDestination) {
      return res.status(404).json({ success: false, message: "Destination not found" });
    }
    res.json({ success: true, message: "Destination deleted successfully" });
  } catch (error) {
    console.error("Error deleting destination:", error);
    res.status(500).json({ success: false, message: "Failed to delete destination", error: error.message });
  }
};

export const getPackagesByDestinationName = async (req, res) => {
  try {
    const { destinationName } = req.params;

    const packages = await destinationService.findManyPackages({
      where: {
        location: {
          contains: destinationName,
          mode: 'insensitive'
        }
      }
    });

    res.json({
      success: true,
      data: {
        packages: packages,
        count: packages.length,
      },
    });
  } catch (error) {
    console.error("Error fetching packages by destination:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch packages",
      error: error.message,
    });
  }
};
