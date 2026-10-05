const { getIO } = require("../sockets");

/**
 * Real-time event broadcasting service
 */
class SocketService {
  /**
   * Broadcast an event to all sockets in a workspace
   */
  emitToWorkspace(workspaceId, event, data) {
    const io = getIO();
    if (io && workspaceId) {
      io.to(`workspace:${workspaceId}`).emit(event, data);
    }
  }

  /**
   * Broadcast an event to all sockets in a project
   */
  emitToProject(projectId, event, data) {
    const io = getIO();
    if (io && projectId) {
      io.to(`project:${projectId}`).emit(event, data);
    }
  }

  /**
   * Broadcast an event to all sockets viewing a board
   */
  emitToBoard(boardId, event, data) {
    const io = getIO();
    if (io && boardId) {
      io.to(`board:${boardId}`).emit(event, data);
    }
  }

  /**
   * Broadcast an event to all sockets viewing an issue
   */
  emitToIssue(issueId, event, data) {
    const io = getIO();
    if (io && issueId) {
      io.to(`issue:${issueId}`).emit(event, data);
    }
  }

  /**
   * Send a private event to a specific user
   */
  emitToUser(userId, event, data) {
    const io = getIO();
    if (io && userId) {
      io.to(`user:${userId}`).emit(event, data);
    }
  }

  /**
   * Global broadcast
   */
  broadcast(event, data) {
    const io = getIO();
    if (io) {
      io.emit(event, data);
    }
  }
}

module.exports = new SocketService();
