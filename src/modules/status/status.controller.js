const prisma = require('../../config/database');

/**
 * GET /api/status/:slug
 * Public endpoint — returns workspace monitors with uptime info.
 */
const getStatusPage = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      include: {
        monitors: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Not Found', message: 'Status page not found' });
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Calculate 24h uptime for each monitor
    const monitorsWithUptime = await Promise.all(
      workspace.monitors.map(async (monitor) => {
        const results = await prisma.checkResult.findMany({
          where: { monitorId: monitor.id, checkedAt: { gte: since24h } },
          select: { status: true },
        });

        const uptime24h =
          results.length > 0
            ? parseFloat(
                ((results.filter((r) => r.status === 'UP').length / results.length) * 100).toFixed(2)
              )
            : null;

        return {
          id: monitor.id,
          name: monitor.name,
          url: monitor.url,
          status: monitor.status,
          lastChecked: monitor.lastChecked,
          uptime24h,
        };
      })
    );

    res.json({
      workspace: {
        name: workspace.name,
        slug: workspace.slug,
      },
      monitors: monitorsWithUptime,
      generatedAt: new Date(),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStatusPage };
